import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { LoadBalancers } from './LoadBalancers'

export const LoadBalancer = () => (
  <DataLoaderProvider>
    <APIProvider>
      <LoadBalancers />
    </APIProvider>
  </DataLoaderProvider>
)
