import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { AllDomains } from './AllDomains'

export const Domains = () => (
  <DataLoaderProvider>
    <APIProvider>
      <AllDomains />
    </APIProvider>
  </DataLoaderProvider>
)
