import { launchAnvilURL } from "./launch-anvil";

export default async function OpenCertificateDecoderCommand() {
  await launchAnvilURL("anvil://tool/certificate-decoder");
}
