import actionBoundary from '../utils/actionBoundary'
import useRequire from '../hooks/useRequire'
import ErrorBoundary from './ErrorBoundary'
import { ActionPanel, List, showToast, Action, Toast, Icon, Color } from '@raycast/api'
import { useEffect, useState } from 'react'
import { changeOptionOfGroup, getPolicies, getPoliciesBenchmark, testPolicyGroup } from '../api'
import { IconIsSelected } from '../utils'
import { BenchmarkT, PoliciesT, ProxiesT } from '../utils/types'

const Policies = () => {
  const {
    response: policies,
    setResponse: setPolicies,
    error,
    loading,
    setError,
  } = useRequire<PoliciesT>({
    apiLoader: getPolicies,
    defaultData: [],
  })

  const onActionHandle = actionBoundary(async (group_name: string, policy: string) => {
    await changeOptionOfGroup({ group_name, policy })
    policies.forEach((item) => item.name === group_name && (item.select = policy))
    setPolicies([...policies])
    await showToast(Toast.Style.Success, 'Success', `The option has been changed to ${policy}.`)
  }, setError)

  return (
    <List isLoading={loading} navigationTitle="Policies">
      <ErrorBoundary error={error}>
        {policies.map(({ name, select, type, proxies }) => (
          <List.Item
            key={name}
            title={name}
            subtitle={type}
            accessoryTitle={select}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Proxies"
                  target={
                    <Proxies
                      select={select}
                      groupName={name}
                      proxies={proxies}
                      onActionHandle={onActionHandle}
                      isSelectType={type === 'SELECT'}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </ErrorBoundary>
    </List>
  )
}

type ProxiesProps = {
  isSelectType: boolean
  select: string
  groupName: string
  proxies: ProxiesT
  onActionHandle: (name: string, option: string) => Promise<void>
}

const Proxies = ({ proxies, groupName, select, isSelectType, onActionHandle }: ProxiesProps) => {
  const [currentProxy, setCurrentProxy] = useState(select)
  const { response: benchmark, run: getBenchmark } = useRequire<BenchmarkT>({
    apiLoader: getPoliciesBenchmark,
    defaultData: {},
    manual: true,
  })

  const { run: test, loading: testing } = useRequire<Record<string, string>, { group_name: string }>({
    apiLoader: testPolicyGroup,
    defaultData: {},
    manual: true,
    loadingInitialState: false,
  })

  useEffect(() => {
    getBenchmark()
  }, [])

  const onTestHandle = async (group_name: string) => {
    await test({ group_name })
    getBenchmark()
  }

  const getAccessories = (lineHash: string) => {
    const res = {
      text: '',
      icon: { source: Icon.LevelMeter, tintColor: Color.PrimaryText },
      tooltip: 'Delay',
    }
    if (benchmark[lineHash]) {
      const { lastTestScoreInMS: delay } = benchmark[lineHash]
      if (delay > 0) {
        res.text = `${delay}ms`
        res.icon.tintColor = Color.Green
      }
      if (delay < 0) {
        res.text = 'Failed'
        res.icon.tintColor = Color.Red
      }
    }
    if (testing) {
      res.text = 'testing'
      res.icon.tintColor = Color.PrimaryText
    }
    return [res]
  }

  return (
    <List navigationTitle="Proxies">
      <List.Section title={groupName}>
        {proxies.map(({ lineHash, name, typeDescription, isGroup }) => (
          <List.Item
            key={lineHash}
            title={name}
            subtitle={typeDescription}
            icon={IconIsSelected(currentProxy === name)}
            accessories={getAccessories(lineHash)}
            actions={
              <ActionPanel>
                {isSelectType && (
                  <Action
                    title={`Use This ${isGroup ? 'Group' : 'Proxy'}`}
                    onAction={() => {
                      onActionHandle(groupName, name)
                      setCurrentProxy(name)
                    }}
                  />
                )}
                <Action
                  title="Delay Test"
                  onAction={() => {
                    onTestHandle(groupName)
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}

export default Policies
