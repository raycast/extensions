# kubebuilder-raycast

Raycast extension for generating Kubernetes YAML from live cluster-discovered resource schemas or remote templates.

## What is implemented

- One Raycast command: `Create Kubernetes YAML`
- Supported manifest sources:
  - Cluster resource discovery from the selected context using `kubectl api-resources --verbs=create`
  - Remote template URL fetch (HTTP/HTTPS)
- Resource coverage:
  - Built-in Kubernetes resource kinds discovered from the cluster
  - Custom resources / CRDs discovered from the cluster
- Schema-aware form generation:
  - Built-in resource schemas loaded from the cluster OpenAPI document
  - CRD schemas loaded from the matching `openAPIV3Schema`
  - Inline inputs for simple fields
  - Nested editors for objects, arrays, and maps
  - Layered defaults from schema defaults plus generated scaffolds
- Built-in input validation for common mistakes:
  - Invalid resource names and namespaces
  - Invalid label / annotation format
  - Required schema fields missing from the form state
- Kubernetes context awareness:
  - Context dropdown loaded from `kubectl config` (fallback to `~/.kube/config` / `KUBECONFIG`)
  - Resource discovery scoped to the selected context
  - Dry run with `cmd + enter`
  - Direct `kubectl apply` with `cmd + shift + enter`
- Cluster resource mode:
  - Lists all create-capable resources visible to the selected cluster context
  - Loads the selected resource schema from the API server
  - Generates a scaffolded manifest from form state rather than raw JSON editing
  - Supports complex nested fields through focused editors
- Remote template mode:
  - Fetches YAML from a URL at submit time
  - Basic validation (valid URL/protocol, non-empty response, rejects HTML payloads)
- Output actions:
  - Copy generated YAML
  - Copy YAML and close Raycast
  - Copy suggested filename
  - Copy `kubectl` apply command

## Project structure

- `src/create-kubernetes-yaml.tsx`: schema-driven form UI, nested editors, resource discovery, and result view
- `src/lib/k8s.ts`: generic manifest builder + generated scaffolds
- `src/lib/kubectl.ts`: context loading, resource discovery, schema loading, dry run, and apply helpers
- `src/lib/schema.ts`: schema normalization and form-state helpers
- `src/lib/templates.ts`: remote template URL fetch + validation
- `src/lib/yaml.ts`: lightweight YAML serializer

## Local development

1. Install dependencies

```bash
npm install
```

2. Run the Raycast extension in dev mode

```bash
npm run dev
```

3. In Raycast, run `Create Kubernetes YAML`

## Next steps

- Improve starter scaffolds for high-friction resource kinds
- Add live YAML preview while editing
- Save manifest to file directly from the action panel
- Support namespace picker and related-resource suggestions from the cluster
