# Terraform Docs — Raycast Extension

Jump to Terraform provider documentation instantly.

## Usage

Open Raycast and type:

```
aws_s3_bucket
azurerm_resource_group
google_compute_instance
data.aws_ami
kubernetes_deployment
```

You can also prefix with `tf ` if you set up a Raycast alias:

```
tf aws_s3_bucket
```

## Install

```bash
# 1. Clone / download this folder
cd terraform-docs

# 2. Install dependencies
npm install

# 3. Import into Raycast
# Open Raycast → Extensions → + → Add Script Directory
# Point it at this folder, then run `npm run dev` to live-reload during development
# Or run `npm run build` for a production build
```

## Supported Providers

| Prefix | Provider |
|---|---|
| `aws_` | AWS |
| `azurerm_` | Azure |
| `azuread_` | Azure AD |
| `google_` | Google Cloud |
| `kubernetes_` | Kubernetes |
| `helm_` | Helm |
| `vault_` | HashiCorp Vault |
| `consul_` | HashiCorp Consul |
| `github_` | GitHub |
| `gitlab_` | GitLab |
| `cloudflare_` | Cloudflare |
| `datadog_` | Datadog |
| `random_` | Random |
| `null_` | Null |
| `local_` | Local |
| `tls_` | TLS |

For unlisted providers, the extension falls back to a registry search.

## Adding more providers

Edit the `PROVIDER_MAP` object in `src/open-tf-docs.tsx`:

```ts
PROVIDER_MAP["mycloud"] = {
  namespace: "myorg",
  provider: "mycloud",
  label: "My Cloud",
};
```

The namespace and provider slug come from the registry URL:
`https://registry.terraform.io/providers/<namespace>/<provider>`
