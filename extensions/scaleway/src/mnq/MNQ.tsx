import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Namespaces } from './Namespaces'

export const MNQ = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Namespaces />
    </APIProvider>
  </DataLoaderProvider>
)
