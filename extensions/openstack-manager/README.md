<p align="center">
  <img src="assets/extension-icon.png" width="128" height="128" alt="OpenStack Manager Icon" />
</p>

# OpenStack Manager

A Raycast extension for browsing and managing OpenStack cloud resources. Access servers, flavors, images, networks, security groups, and Kubernetes clusters across multiple cloud configurations — all from Raycast.

## Features

- **Multi-Cloud Support**: Manage multiple OpenStack clouds from a single interface
- **Resource Browsing**: Browse servers, flavors, images, networks, security groups, and Magnum clusters
- **Server Actions**: Start, stop, and reboot servers directly from Raycast
- **Persistent Caching**: Resources load instantly on subsequent opens with background refresh
- **Detail Views**: Full resource details fetched via `openstack show` commands with all fields displayed
- **Security Group Rules**: View firewall rules for each security group
- **Horizon Integration**: Open any resource in your Horizon dashboard with one shortcut
- **Copy IPs**: Copy all IP addresses from a server with `Cmd+Shift+I`
- **Search & Filter**: Real-time search filtering across all resource lists

## Prerequisites

- [OpenStack CLI](https://docs.openstack.org/python-openstackclient/latest/) (`python-openstackclient`) installed
- At least one cloud configured in `~/.config/openstack/clouds.yaml`

Install the CLI:

```bash
pip install python-openstackclient
```

## Setup

1. Install the extension in Raycast
2. Set the **OpenStack CLI Path** in extension preferences (default: `openstack`). If the CLI is in a virtualenv or non-standard location, use the full path (e.g., `/opt/homebrew/bin/openstack`)
3. Add a cloud configuration via the **Manage Configs** command, or create `~/.config/openstack/clouds.yaml` manually

### Cloud Configuration

Each cloud config uses [application credentials](https://docs.openstack.org/keystone/latest/user/application_credentials.html) for authentication:

```yaml
clouds:
  my-cloud:
    auth_type: v3applicationcredential
    auth:
      auth_url: https://keystone.example.com:5000/v3
      application_credential_id: <your-credential-id>
      application_credential_secret: <your-credential-secret>
    region_name: RegionOne
    interface: public
    identity_api_version: 3
```

You can optionally add a `horizon_url` field to enable "Open in Browser" actions:

```yaml
clouds:
  my-cloud:
    # ... auth fields ...
    horizon_url: https://horizon.example.com
```

## Commands

### Search OpenStack Resources

The main entry point. Flow:

1. **Select a cloud config** from your `clouds.yaml`
2. **Pick a service** (Servers, Flavors, Images, Networks, Security Groups, Kubernetes Clusters)
3. **Browse resources** with search filtering
4. **View details** with full metadata from `openstack show`

### Manage Configs

Add, edit, and remove cloud configurations. Configs are stored in the standard `~/.config/openstack/clouds.yaml` format.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | View details / Browse |
| `Cmd+Shift+C` | Copy resource ID |
| `Cmd+Shift+I` | Copy all IP addresses (servers) |
| `Cmd+R` | Refresh / Reload from CLI |
| `Cmd+O` | Open in Horizon dashboard |

## How It Works

The extension wraps the `openstack` CLI binary. All resource operations are executed via `openstack --os-cloud <config> <command> -f json` and the JSON output is displayed in Raycast. No direct API calls are made — the CLI handles authentication, token management, and endpoint discovery.

Resource lists are cached in Raycast's LocalStorage for instant loading on subsequent opens. A background refresh fetches fresh data automatically. Detail views are also cached per resource ID.

## Feedback & Issues

Found a bug, have a feature request, or need help setting up your cloud configurations? 

Please feel free to [open an issue](https://github.com/PhamQuang-512/OpenStack-Manager/issues) on GitHub. Contributions, suggestions, and feedback are always welcome!