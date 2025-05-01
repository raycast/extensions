import { GarudaLaunchProvider } from '@hooks/useGarudaLaunchContext';
import { App } from 'App';

export default function Command() {
  return (
    <GarudaLaunchProvider>
      <App />
    </GarudaLaunchProvider>
  );
}
