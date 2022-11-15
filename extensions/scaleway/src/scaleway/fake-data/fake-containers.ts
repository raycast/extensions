import {
  Container,
  ContainerDomain,
  ContainerLog,
  ContainerStatus,
  Namespace,
  Privacy,
} from '../types'

const productionNamespace: Namespace = {
  id: '4a1a9390-7f17-44ea-9416-b9c35624b53f',
  name: 'production',
  region: 'fr-par',
  description: 'Production namespace',
  status: ContainerStatus.READY,
}

const betaNamespace: Namespace = {
  id: 'd6f768da-f669-498a-a218-78c1a8b2f02a',
  name: 'beta',
  region: 'fr-par',
  description: 'Beta namespace for testing',
  status: ContainerStatus.READY,
}

export const fakeNamespaces: Namespace[] = [productionNamespace, betaNamespace]

const websiteContainer: Container = {
  id: '9c917bec-c020-468b-8a17-3a3cdff64823',
  name: 'website',
  namespace_id: productionNamespace.id,
  status: ContainerStatus.READY,
  min_scale: 1,
  max_scale: 5,
  memory_limit: 1024,
  cpu_limit: 560,
  timeout: '300s',
  error_message: null,
  privacy: Privacy.PUBLIC,
  description: 'Website container for the company',
  registry_image: 'rg.fr-par.scw.cloud/company/website:latest',
  max_concurrency: 80,
  domain_name: 'website.functions.fnc.fr-par.scw.cloud',
  protocol: 'unknown_protocol',
  port: 8080,
  region: 'fr-par',
}
const documentationContainer: Container = {
  id: 'c9c0091e-cb5b-44ac-bc9f-8b5d2e3001df',
  name: 'documentation',
  namespace_id: productionNamespace.id,
  status: ContainerStatus.READY,
  min_scale: 1,
  max_scale: 2,
  memory_limit: 512,
  cpu_limit: 280,
  timeout: '600s',
  error_message: null,
  privacy: Privacy.PUBLIC,
  description: 'Application documentation',
  registry_image: 'rg.fr-par.scw.cloud/company/documentation:latest',
  max_concurrency: 80,
  domain_name: 'documentation.functions.fnc.fr-par.scw.cloud',
  protocol: 'unknown_protocol',
  port: 8080,
  region: 'fr-par',
}
const taskContainers: Container = {
  id: '0d26d8c7-7b17-40eb-bc3f-b97301875497',
  name: 'tasks',
  namespace_id: productionNamespace.id,
  status: ContainerStatus.PENDING,
  min_scale: 1,
  max_scale: 1,
  memory_limit: 512,
  cpu_limit: 280,
  timeout: '300s',
  error_message: null,
  privacy: Privacy.PRIVATE,
  description: 'Task runner',
  registry_image: 'rg.fr-par.scw.cloud/company/tasks:latest',
  max_concurrency: 80,
  domain_name: 'tasks.functions.fnc.fr-par.scw.cloud',
  protocol: 'unknown_protocol',
  port: 8080,
  region: 'fr-par',
}

const apiContainer: Container = {
  id: '1b16216a-81a5-4b85-b7fc-52842729c5c3',
  name: 'api',
  namespace_id: betaNamespace.id,
  status: ContainerStatus.ERROR,
  min_scale: 1,
  max_scale: 1,
  memory_limit: 512,
  cpu_limit: 280,
  timeout: '300s',
  error_message: "Error: Cannot find module '@company/types'",
  privacy: Privacy.PUBLIC,
  description: 'Beta API container',
  registry_image: 'rg.fr-par.scw.cloud/company/api:latest',
  max_concurrency: 80,
  domain_name: 'api.functions.fnc.fr-par.scw.cloud',
  protocol: 'unknown_protocol',
  port: 8080,
  region: 'fr-par',
}

export const fakeContainers: Container[] = [
  websiteContainer,
  documentationContainer,
  taskContainers,
  apiContainer,
]

export const fakeDomains: ContainerDomain[] = [
  {
    id: '4f9cc162-92c6-4d72-b432-b9b6d952931c',
    hostname: 'company.com',
    container_id: websiteContainer.id,
    url: 'https://company.com',
  },
  {
    id: '9e8ecdde-29e3-4deb-acad-06eb6b541119',
    hostname: 'docs.company.com',
    container_id: documentationContainer.id,
    url: 'https://docs.company.com',
  },
  {
    id: 'c57a298b-76d3-4f18-875f-dec1a655e3ee',
    hostname: 'api.company.com',
    container_id: apiContainer.id,
    url: 'https://api.company.com',
  },
]

export const fakeLogs: ContainerLog[] = [
  {
    message: '{"message":"Ending task : generate_invoice"}',
    timestamp: '2022-11-09T10:16:36Z',
    id: '65148fb8-60a3-4b24-ba6f-fe9af6213492',
    level: 'info',
    source: '',
    stream: 'stdout',
  },
  {
    message: '{"error":"E_DOWNLOAD_FILE: cannot download file","file_id":"d56dcd79-95e7-47b4.pdf"}',
    timestamp: '2022-11-09T09:16:36Z',
    id: '5e4713d3-8634-4d69-add1-37b1e74bce3f',
    level: 'error',
    source: '',
    stream: 'stderr',
  },
  {
    message: '{"message":"Starting task : generate_invoice"}',
    timestamp: '2022-11-09T09:14:31Z',
    id: 'e5db3edf-188d-4f76-9d2c-1d9c7bcc2f41',
    level: 'info',
    source: '',
    stream: 'stdout',
  },
  {
    message: '{"message":"Ending task : generate_invoice"}',
    timestamp: '2022-11-09T00:10:36Z',
    id: '53ff539c-191a-47b6-8ca6-412ee1d24135',
    level: 'info',
    source: '',
    stream: 'stdout',
  },
  {
    message: '{"message":"File downloaded","file_id":"d56dcd79-95e7-47b4.pdf"}',
    timestamp: '2022-11-09T00:09:36Z',
    id: '1eee7602-f71b-4a4a-ab3e-2fd3204fe4a2',
    level: 'info',
    source: '',
    stream: 'stdout',
  },
  {
    message: '{"message":"Starting task : generate_invoice"}',
    timestamp: '2022-11-09T00:16:31Z',
    id: 'bb08cd0c-6eb4-4a45-86ee-1abbe8e92b01',
    level: 'info',
    source: '',
    stream: 'stdout',
  },
  {
    message:
      '{"message":{"content":{"body":{},"params":{"client_id":56}},"request":"GET /clients/56/invoices"},"originIp":"1.2.3.4"}',
    timestamp: '2022-11-09T00:16:27Z',
    id: '0eb60d13-fb1b-426a-b8ca-bb7b5e8496c9',
    level: 'info',
    source: '',
    stream: 'stdout',
  },
  {
    message:
      '{"message":{"content":{"body":{},"params":{"client_id":90}},"request":"GET /clients/90/invoices"},"originIp":"4.3.2.1"}',
    timestamp: '2022-11-09T00:16:27Z',
    id: 'f5e8b147-86ce-4589-ba88-5a4bc654ffb5',
    level: 'info',
    source: '',
    stream: 'stdout',
  },
  {
    message: '{"message":"started server on 0.0.0.0:8080"}',
    timestamp: '2022-11-09T00:16:26Z',
    id: 'd51f13df-5a68-4a25-9deb-ea6b5699920f',
    level: 'info',
    source: '',
    stream: 'stdout',
  },
]
