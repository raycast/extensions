import { join } from 'path';
import Store from './store';

const DEFAULT_PATH = join(process.env.HOME || '', '.password-store');

export default function Command() {
  return <Store storepath={DEFAULT_PATH} />;
}
