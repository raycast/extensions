import axios from "axios";
import Bonjour, { RemoteService } from "bonjour";

export async function toggleKeyLight(service: RemoteService) {
  const url = `http://${service.host}:${service.port}/elgato/lights`;
  const response = await axios.get(url);
  const light = response.data.lights[0];
  return light.on ? await setKeyLight(url, false) : await setKeyLight(url, true);
}

async function setKeyLight(url: string, state: boolean) {
  await axios.put(url, {
    Lights: [
      {
        On: state ? 1 : 0,
      },
    ],
  });
  return state;
}

const TIMEOUT = 3_000;

export async function findKeyLight() {
  const bonjour = Bonjour();

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(async () => {
      reject(new Error("Couldn't find key lights on network"));
    }, TIMEOUT);
  });

  const find = new Promise<RemoteService>((resolve) => {
    bonjour.findOne({ type: "elg" }, async (service) => {
      resolve(service);
      bonjour.destroy();
    });
  });

  return Promise.race([find, timeout]);
}
