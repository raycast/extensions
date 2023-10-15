import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Servers } from './Servers'

export const AppleSilicon = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Servers />
    </APIProvider>
  </DataLoaderProvider>
)
