import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { PNetworks } from './PNetworks'

export const VPC = () => (
  <DataLoaderProvider>
    <PNetworks />
  </DataLoaderProvider>
)
