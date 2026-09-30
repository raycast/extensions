import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Domains } from './Domains'

export const TransactionalEmail = () => (
  <DataLoaderProvider>
    <Domains />
  </DataLoaderProvider>
)
