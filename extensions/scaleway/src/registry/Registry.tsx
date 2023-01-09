import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Images } from './Images'

export const Registry = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Images />
    </APIProvider>
  </DataLoaderProvider>
)
