import {
  LocalStorage,
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Form,
  showToast,
  useNavigation,
  Toast,
} from '@raycast/api'
import { useState } from 'react'
import { IconIsSelected } from '../utils'
import { BackendFormT, BackendsT } from '../utils/types'

type props = {
  backends: BackendsT
  setBackends: React.Dispatch<React.SetStateAction<BackendsT>>
  current: string
  onBackendChange: (name: string) => void
}

const Backends: React.FC<props> = ({
  backends: backendsF,
  setBackends: setBackendsF,
  current: currentF,
  onBackendChange,
}) => {
  const { pop } = useNavigation()
  const [backends, setBackends] = useState<BackendsT>(backendsF as BackendsT)
  const [current, setCurrent] = useState(currentF)

  const handleSubmit = async ({ name, url, xKey }: BackendFormT) => {
    if (name === '' || url === '') return showToast(Toast.Style.Failure, `Name and URL cannot be empty`)

    const isExist = Object.values(backends)
      .map(({ url }) => url)
      .includes(url)

    if (isExist) return showToast(Toast.Style.Failure, `URL Already Exists`, url)

    const data = { ...backends, [name]: { url, xKey } }
    setBackends(data)
    setBackendsF(data)
    await LocalStorage.setItem(name, `${url}@${xKey}`)
    showToast(Toast.Style.Success, 'Add Success', `${name}: ${url}`)
    pop()
    !current && handleUse(name)
  }

  const handleDelete = async (name: string) => {
    await LocalStorage.removeItem(name)
    delete backends[name]
    setBackends({ ...backends })
    setBackendsF({ ...backends })
    showToast(Toast.Style.Success, 'Delete Success', name)

    const backendKeys = Object.keys(backends)
    if (backendKeys.length === 0) {
      handleUse('')
    } else if (current === name) {
      handleUse(backendKeys[0])
    }
  }

  const handleDeleteAll = async () => {
    await LocalStorage.clear()
    setBackends({})
    setBackendsF({})
    handleUse('')
    showToast(Toast.Style.Success, 'Delete Success')
  }

  const handleUse = async (name: string) => {
    setCurrent(name)
    onBackendChange(name)
  }

  const backendList = Object.entries(backends)

  return (
    <List navigationTitle="Backends">
      {backendList.map(([name, { url, xKey }]) => (
        <List.Item
          title={name}
          icon={IconIsSelected(name == current)}
          key={name}
          accessories={[
            { text: url, icon: Icon.Link, tooltip: 'URL' },
            { text: xKey, icon: Icon.XmarkCircle, tooltip: 'X-Key' },
          ]}
          actions={
            <ActionPanel>
              {current !== name && <Action title="Use Backend" onAction={() => handleUse(name)} />}
              <ActionPanel.Submenu title="Delete?">
                <Action title="Yes" onAction={() => handleDelete(name)} />
                <Action title="No" />
              </ActionPanel.Submenu>
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title="Add Backend"
        icon={{ source: Icon.Plus, tintColor: Color.Blue }}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Backend"
              target={
                <Form
                  navigationTitle="Add Backend"
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
                    </ActionPanel>
                  }
                >
                  <Form.TextField id="name" title="Name" placeholder="Mac Mini" />
                  <Form.TextField id="url" title="URL" placeholder="https://127.0.0.1:6171" />
                  <Form.TextField
                    id="xKey"
                    title="X-Key"
                    info={`X-Key is set in the surge configuration E.g.: "http-api = xkey@0.0.0.0:6171". If you want to use HTTPS please set "http-api-tls=true", and you must first configure the MitM CA certificate. You need to install the certificate manually on the client device.`}
                  />
                </Form>
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Delete All Backend"
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        actions={
          <ActionPanel>
            <ActionPanel.Submenu title="Delete All Backend?">
              <Action title="Yes" onAction={handleDeleteAll} />
              <Action title="No" />
            </ActionPanel.Submenu>
          </ActionPanel>
        }
      />
    </List>
  )
}

export default Backends
