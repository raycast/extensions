import mysqlx from '@mysql/xdevapi'

export const getCollection = async (url: string, schemaName: string, collectionName: string) => {
  const session = await mysqlx.getSession(url)
  const schema = await session.getSchema(schemaName)
  return schema.createCollection(collectionName, { reuseExisting: true })
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined
}

const BOOLEAN_OPERATOR = ['=', 'like', '<>', '>', '<', 'in'] as const

type BooleanOperator = (typeof BOOLEAN_OPERATOR)[number]

type BooleanExpression = {
  operator: BooleanOperator
  values: [string, string]
}

const COMBINE_OPERATOR = ['and', 'or'] as const

type CombineOperator = (typeof COMBINE_OPERATOR)[number]

type CombineExpression = {
  operator: CombineOperator
  values: (Expression | null)[]
}

type Expression = BooleanExpression | CombineExpression
const buildIs = (operators: readonly string[]) => {
  const maps = operators.reduce((s, o) => ({ ...s, [o]: true }), {} as Record<string, boolean>)
  return (ex: Expression | null): boolean => ex !== null && maps[ex.operator] !== undefined
}
const isBooleanEx = buildIs(BOOLEAN_OPERATOR) as (ex: Expression | null) => ex is BooleanExpression
const isCombineEx = buildIs(COMBINE_OPERATOR) as (ex: Expression | null) => ex is CombineExpression
const buildBooleanExpression = (c: BooleanExpression): string => {
  const [prev, next] = c.values
  return `${prev} ${c.operator} ${next}`
}
function isString(o: any): o is string {
  return typeof o === 'string'
}
export const buildExpression = (ex: Expression | string): string => {
  if (isString(ex)) {
    return ex
  }

  if (isBooleanEx(ex)) {
    return buildBooleanExpression(ex)
  }

  if (isCombineEx(ex)) {
    const validCondition = ex.values.filter(notEmpty)
    const expression = validCondition.map(buildExpression).join(` ${ex.operator} `)
    return validCondition.length > 1 ? `(${expression})` : expression
  }

  throw new Error('Build expression error')
}

const booleanOperationBuilder = (operator: BooleanOperator) => (prev: string, next: string) =>
  ({
    operator,
    values: [prev, next]
  } as BooleanExpression)

const combineOperationBuilder =
  (operator: CombineOperator) =>
  (...values: Array<Expression | null>) =>
    ({
      operator,
      values
    } as CombineExpression)

export const Operator = {
  eq: booleanOperationBuilder('='),
  like: booleanOperationBuilder('like'),
  and: combineOperationBuilder('and'),
  or: combineOperationBuilder('or')
}
