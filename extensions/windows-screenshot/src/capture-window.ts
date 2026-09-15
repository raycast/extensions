import { executeCapture } from './utils/screenshot';

export default async function Command() {
  await executeCapture('window');
}
