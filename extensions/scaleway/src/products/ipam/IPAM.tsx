import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Ips } from './Ips'

export const IPAM = () => (
  <DataLoaderProvider>
    <Ips />
  </DataLoaderProvider>
)
