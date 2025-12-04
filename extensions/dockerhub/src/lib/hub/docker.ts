import Dockerode from "@priithaamer/dockerode";
import { Toast, showToast, getPreferenceValues } from "@raycast/api";

interface ProgressEvent {
  status?: string;
}

const { socketPath } = getPreferenceValues();
const docker = new Dockerode({ socketPath });

export const pullImage = async (image: string): Promise<void> => {
  const toast = await showToast(Toast.Style.Animated, "Pulling image...");

  try {
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, {}, (err, stream) => {
        if (err) {
          updateToast(toast, Toast.Style.Failure, "Error pulling image", `${err}`);
          reject(err);
          return;
        }
        docker.modem.followProgress(stream, onFinished, onProgress);

        function onFinished(err: Error | undefined, output: any): void {
          if (err) {
            updateToast(toast, Toast.Style.Failure, "Error pulling image", `${err}`);
            reject(err);
          } else {
            updateToast(toast, Toast.Style.Success, "Image pulled", `${image}`);
            resolve();
          }
        }

        function onProgress(event: ProgressEvent): void {
          if (event.status) {
            updateToast(toast, Toast.Style.Animated, "Pulling image...", `${image} ${event.status}`);
          }
        }
      });
    });
  } catch (error) {
    updateToast(toast, Toast.Style.Failure, "Error pulling image", `${error}`);
  }
};

function updateToast(toast: Toast, style: Toast.Style, title: string, message: string): void {
  Object.assign(toast, { style, title, message });
}

export const checkImageExists = async (image: string): Promise<boolean> => {
  try {
    await docker.getImage(image).inspect();
    return true;
  } catch (error) {
    return false;
  }
};
