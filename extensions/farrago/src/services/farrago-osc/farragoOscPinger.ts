import { AbortError } from "@/utils/helpers";

import { initializeFarragoOscReceiver, initializeFarragoOscSender } from "../initializers";
import { FarragoOscReceiver } from "./farragoOscReceiver";
import { FarragoOscSender } from "./farragoOscSender";

export class FarragoOscPinger {
  ac: AbortController;
  snd: FarragoOscSender;
  rcv: FarragoOscReceiver;

  constructor() {
    this.ac = new AbortController();
    this.snd = initializeFarragoOscSender();
    this.rcv = initializeFarragoOscReceiver();
  }

  async ping() {
    return new Promise<boolean>((resolve, reject) => {
      if (this.ac.signal.aborted) return reject(new AbortError());

      try {
        let done = false;

        const cleanup = () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          unsubscribe();
          this.ac.signal.removeEventListener("abort", onAbort);
        };

        const onAbort = () => {
          cleanup();
          reject(new AbortError());
        };

        const unsubscribe = this.rcv.subscribeToPing(() => {
          cleanup();
          resolve(true);
        });

        const timer = setTimeout(() => {
          cleanup();
          resolve(false);
        }, 1000);

        this.ac.signal.addEventListener("abort", onAbort);

        this.snd.ping();
      } catch (err) {
        reject(err);
      }
    });
  }

  abort() {
    this.ac.abort();
    this.rcv.close();
  }
}
