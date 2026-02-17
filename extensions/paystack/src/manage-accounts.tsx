import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  Form,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Color,
} from '@raycast/api'
import { useCachedPromise } from '@raycast/utils'
import {
  getAccounts,
  setActiveAccountId,
  getActiveAccountId,
  addAccount,
  updateAccount,
  deleteAccount,
  ensureDefaultAccount,
} from './utils/accounts'
import { PaystackAccount } from './utils/types'

export default function Command() {
  const {
    data,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    await ensureDefaultAccount()
    const accounts = await getAccounts()
    const activeId = await getActiveAccountId()
    return { accounts, activeId }
  })

  const accounts = data?.accounts ?? []
  const activeId = data?.activeId

  async function handleSetActive(account: PaystackAccount) {
    await setActiveAccountId(account.id)
    showToast({ style: Toast.Style.Success, title: `Switched to ${account.name}` })
    revalidate()
  }

  async function handleDelete(account: PaystackAccount) {
    if (
      await confirmAlert({
        title: `Delete "${account.name}"?`,
        message: 'This will permanently remove the account and its keys.',
        icon: Icon.Trash,
        primaryAction: {
          title: 'Delete',
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await deleteAccount(account.id)
      showToast({ style: Toast.Style.Success, title: `Deleted ${account.name}` })
      revalidate()
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts...">
      {accounts.map((account) => {
        const isActive = account.id === activeId
        return (
          <List.Item
            key={account.id}
            title={account.name}
            icon={isActive ? Icon.CheckCircle : Icon.Circle}
            accessories={
              isActive
                ? [{ tag: { value: 'Active', color: Color.Green } }]
                : []
            }
            actions={
              <ActionPanel>
                {!isActive && (
                  <Action
                    title="Set as Active"
                    icon={Icon.CheckCircle}
                    onAction={() => handleSetActive(account)}
                  />
                )}
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={
                    <AccountForm
                      account={account}
                      onSave={revalidate}
                    />
                  }
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ['ctrl'], key: 'x' }}
                  onAction={() => handleDelete(account)}
                />
                <Action.Push
                  title="Add New Account"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ['cmd'], key: 'n' }}
                  target={<AccountForm onSave={revalidate} />}
                />
              </ActionPanel>
            }
          />
        )
      })}
      {!isLoading && (
        <List.EmptyView
          title="No Accounts"
          description="Add your first Paystack account"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Account"
                icon={Icon.Plus}
                target={<AccountForm onSave={revalidate} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  )
}

interface AccountFormProps {
  account?: PaystackAccount
  onSave: () => void
}

function AccountForm({ account, onSave }: AccountFormProps) {
  const { pop } = useNavigation()

  async function handleSubmit(values: {
    name: string
    liveSecretKey: string
    testSecretKey: string
  }) {
    if (!values.name.trim()) {
      showToast({ style: Toast.Style.Failure, title: 'Name is required' })
      return
    }
    if (!values.liveSecretKey.trim() || !values.testSecretKey.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Both secret keys are required',
      })
      return
    }

    const accountData = {
      name: values.name,
      liveSecretKey: values.liveSecretKey,
      testSecretKey: values.testSecretKey,
    }

    if (account) {
      await updateAccount(account.id, accountData)
      showToast({ style: Toast.Style.Success, title: `Updated ${values.name}` })
    } else {
      await addAccount(accountData)
      showToast({
        style: Toast.Style.Success,
        title: `Added ${values.name}`,
        message: 'This account is now active',
      })
    }
    onSave()
    pop()
  }

  return (
    <Form
      navigationTitle={account ? `Edit ${account.name}` : 'Add Account'}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={account ? 'Save Changes' : 'Add Account'}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Account Name"
        placeholder="e.g. My Business"
        defaultValue={account?.name}
      />
      <Form.PasswordField
        id="liveSecretKey"
        title="Live Secret Key"
        placeholder="sk_live_..."
        defaultValue={account?.liveSecretKey}
      />
      <Form.PasswordField
        id="testSecretKey"
        title="Test Secret Key"
        placeholder="sk_test_..."
        defaultValue={account?.testSecretKey}
      />
    </Form>
  )
}
