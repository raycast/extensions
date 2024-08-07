import { Form, type LaunchProps } from '@raycast/api'
import { useForm } from '@raycast/utils'
// @ts-expect-error - no types :(
import Units from 'ethereumjs-units'
import { useEffect, useState } from 'react'

type Values = {
  ether: string
  wei: string
  gwei: string
  spark: string
}

export default function Command(parameters: LaunchProps<{ arguments: { value: string } }>) {
  const { value } = parameters.arguments

  const [ready, setReady] = useState(false)
  useEffect(() => {
    setTimeout(() => setReady(true), 100)
  }, [])

  const [_, number, unit_raw] = value.match(/(\d*\.?\d*)\s*(\w+)/) || []

  const unit = (() => {
    const unit = unit_raw.toLowerCase()
    if (unit.startsWith('e')) return 'ether'
    if (unit.startsWith('w')) return 'wei'
    if (unit.startsWith('g')) return 'gwei'
    if (unit.startsWith('s')) return 'spark'
    return 'ether'
  })()

  const { itemProps, setValue } = useForm<Values>({
    onSubmit() {},
    initialValues: {
      ether: unit === 'ether' ? number : '0',
      wei: unit === 'wei' ? number : '0',
      gwei: unit === 'gwei' ? number : '0',
      spark: unit === 'spark' ? number : '0',
    },
  })

  function clear() {
    setValue('wei', '0')
    setValue('ether', '0')
    setValue('spark', '0')
    setValue('gwei', '0')
  }

  return (
    <Form>
      <Form.TextField
        title="Ether"
        {...itemProps.ether}
        autoFocus={unit === 'ether'}
        onBlur={(e) => {
          if (!e.target.value) clear()
        }}
        onChange={(value) => {
          if (!ready && unit !== 'ether') return
          if (Number.isNaN(Number(value))) return

          setValue('ether', value)
          setValue('spark', value ? Units.convert(value, 'ether', 'micro') : '0')
          setValue('gwei', value ? Units.convert(value, 'ether', 'gwei') : '0')
          setValue('wei', value ? Units.convert(value, 'ether', 'wei') : '0')
        }}
      />

      <Form.TextField
        title="Spark"
        {...itemProps.spark}
        autoFocus={unit === 'spark'}
        onBlur={(e) => {
          if (!e.target.value) clear()
        }}
        onChange={(value) => {
          if (!ready && unit !== 'spark') return
          if (Number.isNaN(Number(value))) return

          setValue('spark', value)
          setValue('ether', value ? Units.convert(value, 'micro', 'ether') : '0')
          setValue('gwei', value ? Units.convert(value, 'micro', 'gwei') : '0')
          setValue('wei', value ? Units.convert(value, 'micro', 'wei') : '0')
        }}
      />

      <Form.TextField
        title="Gwei"
        {...itemProps.gwei}
        autoFocus={unit === 'gwei'}
        onBlur={(e) => {
          if (!e.target.value) clear()
        }}
        onChange={(value) => {
          if (!ready && unit !== 'gwei') return
          if (Number.isNaN(Number(value))) return

          setValue('gwei', value)
          setValue('ether', value ? Units.convert(value, 'gwei', 'ether') : '0')
          setValue('spark', value ? Units.convert(value, 'gwei', 'micro') : '0')
          setValue('wei', value ? Units.convert(value, 'gwei', 'wei') : '0')
        }}
      />

      <Form.TextField
        title="Wei"
        {...itemProps.wei}
        autoFocus={unit === 'wei'}
        onBlur={(e) => {
          if (!e.target.value) clear()
        }}
        onChange={(value) => {
          if (!ready && unit !== 'wei') return
          if (Number.isNaN(Number(value))) return

          setValue('wei', value)
          setValue('ether', value ? Units.convert(value, 'wei', 'ether') : '0')
          setValue('spark', value ? Units.convert(value, 'wei', 'micro') : '0')
          setValue('gwei', value ? Units.convert(value, 'wei', 'gwei') : '0')
        }}
      />
    </Form>
  )
}
