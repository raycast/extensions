export const GOCDAcceptHeaders = {
  v1: { Accept: 'application/vnd.go.cd.v1+json' },
  v2: { Accept: 'application/vnd.go.cd.v2+json' },
  v3: { Accept: 'application/vnd.go.cd.v3+json' }
}

export enum StageStatus {
  Passed = 'Passed',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
  Unknown = 'Unknown',
  Building = 'Building'
}
