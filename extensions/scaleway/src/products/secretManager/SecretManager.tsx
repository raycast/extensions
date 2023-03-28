import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from 'providers'
import { Secrets } from './Secrets'

export const SecretManager = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Secrets />
    </APIProvider>
  </DataLoaderProvider>
)
