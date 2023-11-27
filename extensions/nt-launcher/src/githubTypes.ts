
export interface GithubArtifactRoot {
  total_count: number,
  artifacts: [GithubArtifactDetails]
}

export interface GithubArtifactDetails {
  name: string,
  archive_download_url: string,
  created_at: string,
  expired: boolean,
  expires_at: string,
  workflow_run: GithubWorkflowRunDetails
}

export interface GithubWorkflowRunDetails {
  id: number,
  head_branch: string,
  head_sha: string
}

export interface GithubBranchDetails {
  name: string
}