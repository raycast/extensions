import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { PNetworks } from './PNetworks'

export const PublicGateways = () => (
  <DataLoaderProvider>
    <APIProvider>
      <PNetworks />
    </APIProvider>
  </DataLoaderProvider>
)
