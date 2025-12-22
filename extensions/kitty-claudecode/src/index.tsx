/**
 * Entry point for the Raycast extension
 */

import ListTabs from './commands/listTabs'
import QueryTabs from './commands/queryTabs'

// Export all commands as named exports
export { ListTabs, QueryTabs }

// Default to ListTabs for backward compatibility
export default ListTabs
