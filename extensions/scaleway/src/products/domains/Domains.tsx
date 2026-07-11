import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { AllDomains } from './AllDomains'

export const Domains = () => (
  <DataLoaderProvider>
    <AllDomains />
  </DataLoaderProvider>
)
