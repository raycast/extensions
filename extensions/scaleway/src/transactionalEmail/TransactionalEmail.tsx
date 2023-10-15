import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Domains } from './Domains'

export const TransactionalEmail = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Domains />
    </APIProvider>
  </DataLoaderProvider>
)
