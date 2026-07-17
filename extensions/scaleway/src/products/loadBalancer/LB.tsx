import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { LoadBalancers } from './LoadBalancers'

export const LoadBalancer = () => (
  <DataLoaderProvider>
    <LoadBalancers />
  </DataLoaderProvider>
)
