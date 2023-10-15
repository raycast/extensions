import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Gateways } from './Gateways'

export const PublicGateways = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Gateways />
    </APIProvider>
  </DataLoaderProvider>
)
