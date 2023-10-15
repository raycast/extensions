import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Instances } from './Instances'

export const Databases = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Instances />
    </APIProvider>
  </DataLoaderProvider>
)
