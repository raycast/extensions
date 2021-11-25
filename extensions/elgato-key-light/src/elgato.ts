import axios from "axios";
import Bonjour, { RemoteService } from "bonjour";
import { waitUntil } from "./utils";

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

export async function findKeyLight() {
  const bonjour = Bonjour();

  const find = new Promise<RemoteService>((resolve) => {
    bonjour.findOne({ type: "elg" }, (service) => {
      resolve(service);
      bonjour.destroy();
    });
  });

  return waitUntil(find, { timeoutMessage: "Cannot find any Key Lights in the network" });
}
