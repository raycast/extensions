import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Secrets } from './Secrets'

export const SecretManager = () => (
  <DataLoaderProvider>
    <Secrets />
  </DataLoaderProvider>
)
