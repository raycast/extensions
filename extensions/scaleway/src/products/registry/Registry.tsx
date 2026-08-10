import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Images } from './Images'

export const Registry = () => (
  <DataLoaderProvider>
    <Images />
  </DataLoaderProvider>
)
