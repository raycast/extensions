## [Initial Version] - {PR_MERGE_DATE}

- Search applications across several ArgoCD instances at once, or one of them, with a scope
  selector that survives a relaunch. Results paint from a local cache first and refresh behind
  you.
- An application detail view that leads with the resources needing attention, then the commit
  actually deployed with its author and message, the recent deployments and who triggered each,
  and the images.
- A resources view listing every object an application manages with its sync state, health, sync
  wave, hook and prune flags, plus a per-resource diff and a ready-to-paste `kubectl` command.
- A diff of what is out of sync, shown as a unified diff with the noise Kubernetes writes itself
  filtered out.
- Search ApplicationSets, with a rollup of what each one generated and a jump to those
  applications. ApplicationSets are also reconstructed from the applications they own, so the
  list is useful even where the ApplicationSet API returns nothing.
- A sync form covering revision, prune, dry run, apply-only, force, replace, server-side apply,
  prune last, schema validation and retry, and a live status view that follows a running sync
  until it finishes.
- A menu bar command counting what is degraded, missing or out of sync across every instance,
  quiet by default until something needs attention.
- Three authentication modes: single sign-on that logs in once in a browser and renews itself
  silently, the session the `argocd` CLI already holds, and an API token.
- A reachability check per instance, so a VPN that is down is reported in under a second rather
  than after every request has timed out.
- Write operations off by default, impossible to enable on a production instance, and refused
  independently of the interface hiding them.
