import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Gateways } from './Gateways'

export const PublicGateways = () => (
  <DataLoaderProvider>
    <Gateways />
  </DataLoaderProvider>
)
