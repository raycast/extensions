import type { ModuleDoc } from "../types";

export const Registry: ModuleDoc = {
  functions: [
    {
      name: "values/3",
      type: "function",
      specs: ["@spec values(registry(), key(), pid()) :: [value()]"],
      documentation:
        'Reads the values for the given `key` for `pid` in `registry`.\n\nFor unique registries, it is either an empty list or a list\nwith a single element. For duplicate registries, it is a list\nwith zero, one, or multiple elements.\n\n## Examples\n\nIn the example below we register the current process and look it up\nboth from itself and other processes:\n\n    iex> Registry.start_link(keys: :unique, name: Registry.UniqueValuesTest)\n    iex> Registry.values(Registry.UniqueValuesTest, "hello", self())\n    []\n    iex> {:ok, _} = Registry.register(Registry.UniqueValuesTest, "hello", :world)\n    iex> Registry.values(Registry.UniqueValuesTest, "hello", self())\n    [:world]\n    iex> Task.async(fn -> Registry.values(Registry.UniqueValuesTest, "hello", self()) end) |> Task.await()\n    []\n    iex> parent = self()\n    iex> Task.async(fn -> Registry.values(Registry.UniqueValuesTest, "hello", parent) end) |> Task.await()\n    [:world]\n\nThe same applies to duplicate registries:\n\n    iex> Registry.start_link(keys: :duplicate, name: Registry.DuplicateValuesTest)\n    iex> Registry.values(Registry.DuplicateValuesTest, "hello", self())\n    []\n    iex> {:ok, _} = Registry.register(Registry.DuplicateValuesTest, "hello", :world)\n    iex> Registry.values(Registry.DuplicateValuesTest, "hello", self())\n    [:world]\n    iex> {:ok, _} = Registry.register(Registry.DuplicateValuesTest, "hello", :another)\n    iex> Enum.sort(Registry.values(Registry.DuplicateValuesTest, "hello", self()))\n    [:another, :world]\n\n',
    },
    {
      name: "update_value/3",
      type: "function",
      specs: [
        "@spec update_value(registry(), key(), (value() -> value())) ::\n        {new_value :: term(), old_value :: term()} | :error",
      ],
      documentation:
        'Updates the value for `key` for the current process in the unique `registry`.\n\nReturns a `{new_value, old_value}` tuple or `:error` if there\nis no such key assigned to the current process.\n\nIf a non-unique registry is given, an error is raised.\n\n## Examples\n\n    iex> Registry.start_link(keys: :unique, name: Registry.UpdateTest)\n    iex> {:ok, _} = Registry.register(Registry.UpdateTest, "hello", 1)\n    iex> Registry.lookup(Registry.UpdateTest, "hello")\n    [{self(), 1}]\n    iex> Registry.update_value(Registry.UpdateTest, "hello", &(&1 + 1))\n    {2, 1}\n    iex> Registry.lookup(Registry.UpdateTest, "hello")\n    [{self(), 2}]\n\n',
    },
    {
      name: "unregister_match/4",
      type: "function",
      specs: [
        "@spec unregister_match(registry(), key(), match_pattern(), guards()) :: :ok",
      ],
      documentation:
        'Unregisters entries for keys matching a pattern associated to the current\nprocess in `registry`.\n\n## Examples\n\nFor unique registries it can be used to conditionally unregister a key on\nthe basis of whether or not it matches a particular value.\n\n    iex> Registry.start_link(keys: :unique, name: Registry.UniqueUnregisterMatchTest)\n    iex> Registry.register(Registry.UniqueUnregisterMatchTest, "hello", :world)\n    iex> Registry.keys(Registry.UniqueUnregisterMatchTest, self())\n    ["hello"]\n    iex> Registry.unregister_match(Registry.UniqueUnregisterMatchTest, "hello", :foo)\n    :ok\n    iex> Registry.keys(Registry.UniqueUnregisterMatchTest, self())\n    ["hello"]\n    iex> Registry.unregister_match(Registry.UniqueUnregisterMatchTest, "hello", :world)\n    :ok\n    iex> Registry.keys(Registry.UniqueUnregisterMatchTest, self())\n    []\n\nFor duplicate registries:\n\n    iex> Registry.start_link(keys: :duplicate, name: Registry.DuplicateUnregisterMatchTest)\n    iex> Registry.register(Registry.DuplicateUnregisterMatchTest, "hello", :world_a)\n    iex> Registry.register(Registry.DuplicateUnregisterMatchTest, "hello", :world_b)\n    iex> Registry.register(Registry.DuplicateUnregisterMatchTest, "hello", :world_c)\n    iex> Registry.keys(Registry.DuplicateUnregisterMatchTest, self())\n    ["hello", "hello", "hello"]\n    iex> Registry.unregister_match(Registry.DuplicateUnregisterMatchTest, "hello", :world_a)\n    :ok\n    iex> Registry.keys(Registry.DuplicateUnregisterMatchTest, self())\n    ["hello", "hello"]\n    iex> Registry.lookup(Registry.DuplicateUnregisterMatchTest, "hello")\n    [{self(), :world_b}, {self(), :world_c}]\n\n',
    },
    {
      name: "unregister/2",
      type: "function",
      specs: ["@spec unregister(registry(), key()) :: :ok"],
      documentation:
        'Unregisters all entries for the given `key` associated to the current\nprocess in `registry`.\n\nAlways returns `:ok` and automatically unlinks the current process from\nthe owner if there are no more keys associated to the current process. See\nalso `register/3` to read more about the "owner".\n\nIf the registry has listeners specified via the `:listeners` option in `start_link/1`,\nthose listeners will be notified of the unregistration and will receive a\nmessage of type `t:listener_message/0`.\n\n## Examples\n\nFor unique registries:\n\n    iex> Registry.start_link(keys: :unique, name: Registry.UniqueUnregisterTest)\n    iex> Registry.register(Registry.UniqueUnregisterTest, "hello", :world)\n    iex> Registry.keys(Registry.UniqueUnregisterTest, self())\n    ["hello"]\n    iex> Registry.unregister(Registry.UniqueUnregisterTest, "hello")\n    :ok\n    iex> Registry.keys(Registry.UniqueUnregisterTest, self())\n    []\n\nFor duplicate registries:\n\n    iex> Registry.start_link(keys: :duplicate, name: Registry.DuplicateUnregisterTest)\n    iex> Registry.register(Registry.DuplicateUnregisterTest, "hello", :world)\n    iex> Registry.register(Registry.DuplicateUnregisterTest, "hello", :world)\n    iex> Registry.keys(Registry.DuplicateUnregisterTest, self())\n    ["hello", "hello"]\n    iex> Registry.unregister(Registry.DuplicateUnregisterTest, "hello")\n    :ok\n    iex> Registry.keys(Registry.DuplicateUnregisterTest, self())\n    []\n\n',
    },
    {
      name: "start_link/1",
      type: "function",
      specs: [
        "@spec start_link([start_option()]) :: {:ok, pid()} | {:error, term()}",
      ],
      documentation:
        "Starts the registry as a supervisor process.\n\nManually it can be started as:\n\n    Registry.start_link(keys: :unique, name: MyApp.Registry)\n\nIn your supervisor tree, you would write:\n\n    Supervisor.start_link([\n      {Registry, keys: :unique, name: MyApp.Registry}\n    ], strategy: :one_for_one)\n\nFor intensive workloads, the registry may also be partitioned (by specifying\nthe `:partitions` option). If partitioning is required then a good default is to\nset the number of partitions to the number of schedulers available:\n\n    Registry.start_link(\n      keys: :unique,\n      name: MyApp.Registry,\n      partitions: System.schedulers_online()\n    )\n\nor:\n\n    Supervisor.start_link([\n      {Registry, keys: :unique, name: MyApp.Registry, partitions: System.schedulers_online()}\n    ], strategy: :one_for_one)\n\n## Options\n\nThe registry requires the following keys:\n\n  * `:keys` - chooses if keys are `:unique` or `:duplicate`\n  * `:name` - the name of the registry and its tables\n\nThe following keys are optional:\n\n  * `:partitions` - the number of partitions in the registry. Defaults to `1`.\n  * `:listeners` - a list of named processes which are notified of register\n    and unregister events. The registered process must be monitored by the\n    listener if the listener wants to be notified if the registered process\n    crashes. Messages sent to listeners are of type `t:listener_message/0`.\n  * `:meta` - a keyword list of metadata to be attached to the registry.\n\n",
    },
    {
      name: "select/2",
      type: "function",
      specs: ["@spec select(registry(), spec()) :: [term()]"],
      documentation:
        'Select key, pid, and values registered using full match specs.\n\nThe `spec` consists of a list of three part tuples, in the shape of `[{match_pattern, guards, body}]`.\n\nThe first part, the match pattern, must be a tuple that will match the structure of the\nthe data stored in the registry, which is `{key, pid, value}`. The atom `:_` can be used to\nignore a given value or tuple element, while the atom `:"$1"` can be used to temporarily\nassign part of pattern to a variable for a subsequent comparison. This can be combined\nlike `{:"$1", :_, :_}`.\n\nThe second part, the guards, is a list of conditions that allow filtering the results.\nEach guard is a tuple, which describes checks that should be passed by assigned part of pattern.\nFor example the `$1 > 1` guard condition would be expressed as the `{:>, :"$1", 1}` tuple.\nPlease note that guard conditions will work only for assigned\nvariables like `:"$1"`, `:"$2"`, and so forth.\n\nThe third part, the body, is a list of shapes of the returned entries. Like guards, you have access to\nassigned variables like `:"$1"`, which you can combine with hard-coded values to freely shape entries\nNote that tuples have to be wrapped in an additional tuple. To get a result format like\n`%{key: key, pid: pid, value: value}`, assuming you bound those variables in order in the match part,\nyou would provide a body like `[%{key: :"$1", pid: :"$2", value: :"$3"}]`. Like guards, you can use\nsome operations like `:element` to modify the output format.\n\nDo not use special match variables `:"$_"` and `:"$$"`, because they might not work as expected.\n\nNote that for large registries with many partitions this will be costly as it builds the result by\nconcatenating all the partitions.\n\n## Examples\n\nThis example shows how to get everything from the registry:\n\n    iex> Registry.start_link(keys: :unique, name: Registry.SelectAllTest)\n    iex> {:ok, _} = Registry.register(Registry.SelectAllTest, "hello", :value)\n    iex> {:ok, _} = Registry.register(Registry.SelectAllTest, "world", :value)\n    iex> Registry.select(Registry.SelectAllTest, [{{:"$1", :"$2", :"$3"}, [], [{{:"$1", :"$2", :"$3"}}]}]) |> Enum.sort()\n    [{"hello", self(), :value}, {"world", self(), :value}]\n\nGet all keys in the registry:\n\n    iex> Registry.start_link(keys: :unique, name: Registry.SelectAllTest)\n    iex> {:ok, _} = Registry.register(Registry.SelectAllTest, "hello", :value)\n    iex> {:ok, _} = Registry.register(Registry.SelectAllTest, "world", :value)\n    iex> Registry.select(Registry.SelectAllTest, [{{:"$1", :_, :_}, [], [:"$1"]}]) |> Enum.sort()\n    ["hello", "world"]\n\n',
    },
    {
      name: "register/3",
      type: "function",
      specs: [
        "@spec register(registry(), key(), value()) ::\n        {:ok, pid()} | {:error, {:already_registered, pid()}}",
      ],
      documentation:
        'Registers the current process under the given `key` in `registry`.\n\nA value to be associated with this registration must also be given.\nThis value will be retrieved whenever dispatching or doing a key\nlookup.\n\nThis function returns `{:ok, owner}` or `{:error, reason}`.\nThe `owner` is the PID in the registry partition responsible for\nthe PID. The owner is automatically linked to the caller.\n\nIf the registry has unique keys, it will return `{:ok, owner}` unless\nthe key is already associated to a PID, in which case it returns\n`{:error, {:already_registered, pid}}`.\n\nIf the registry has duplicate keys, multiple registrations from the\ncurrent process under the same key are allowed.\n\nIf the registry has listeners specified via the `:listeners` option in `start_link/1`,\nthose listeners will be notified of the registration and will receive a\nmessage of type `t:listener_message/0`.\n\n## Examples\n\nRegistering under a unique registry does not allow multiple entries:\n\n    iex> Registry.start_link(keys: :unique, name: Registry.UniqueRegisterTest)\n    iex> {:ok, _} = Registry.register(Registry.UniqueRegisterTest, "hello", :world)\n    iex> Registry.register(Registry.UniqueRegisterTest, "hello", :later)\n    {:error, {:already_registered, self()}}\n    iex> Registry.keys(Registry.UniqueRegisterTest, self())\n    ["hello"]\n\nSuch is possible for duplicate registries though:\n\n    iex> Registry.start_link(keys: :duplicate, name: Registry.DuplicateRegisterTest)\n    iex> {:ok, _} = Registry.register(Registry.DuplicateRegisterTest, "hello", :world)\n    iex> {:ok, _} = Registry.register(Registry.DuplicateRegisterTest, "hello", :world)\n    iex> Registry.keys(Registry.DuplicateRegisterTest, self())\n    ["hello", "hello"]\n\n',
    },
    {
      name: "put_meta/3",
      type: "function",
      specs: ["@spec put_meta(registry(), meta_key(), meta_value()) :: :ok"],
      documentation:
        'Stores registry metadata.\n\nAtoms and tuples are allowed as keys.\n\n## Examples\n\n    iex> Registry.start_link(keys: :unique, name: Registry.PutMetaTest)\n    iex> Registry.put_meta(Registry.PutMetaTest, :custom_key, "custom_value")\n    :ok\n    iex> Registry.meta(Registry.PutMetaTest, :custom_key)\n    {:ok, "custom_value"}\n    iex> Registry.put_meta(Registry.PutMetaTest, {:tuple, :key}, "tuple_value")\n    :ok\n    iex> Registry.meta(Registry.PutMetaTest, {:tuple, :key})\n    {:ok, "tuple_value"}\n\n',
    },
    {
      name: "meta/2",
      type: "function",
      specs: [
        "@spec meta(registry(), meta_key()) :: {:ok, meta_value()} | :error",
      ],
      documentation:
        'Reads registry metadata given on `start_link/1`.\n\nAtoms and tuples are allowed as keys.\n\n## Examples\n\n    iex> Registry.start_link(keys: :unique, name: Registry.MetaTest, meta: [custom_key: "custom_value"])\n    iex> Registry.meta(Registry.MetaTest, :custom_key)\n    {:ok, "custom_value"}\n    iex> Registry.meta(Registry.MetaTest, :unknown_key)\n    :error\n\n',
    },
    {
      name: "match/4",
      type: "function",
      specs: [
        "@spec match(registry(), key(), match_pattern(), guards()) :: [{pid(), term()}]",
      ],
      documentation:
        'Returns `{pid, value}` pairs under the given `key` in `registry` that match `pattern`.\n\nPattern must be an atom or a tuple that will match the structure of the\nvalue stored in the registry. The atom `:_` can be used to ignore a given\nvalue or tuple element, while the atom `:"$1"` can be used to temporarily assign part\nof pattern to a variable for a subsequent comparison.\n\nOptionally, it is possible to pass a list of guard conditions for more precise matching.\nEach guard is a tuple, which describes checks that should be passed by assigned part of pattern.\nFor example the `$1 > 1` guard condition would be expressed as the `{:>, :"$1", 1}` tuple.\nPlease note that guard conditions will work only for assigned\nvariables like `:"$1"`, `:"$2"`, and so forth.\nAvoid usage of special match variables `:"$_"` and `:"$$"`, because it might not work as expected.\n\nAn empty list will be returned if there is no match.\n\nFor unique registries, a single partition lookup is necessary. For\nduplicate registries, all partitions must be looked up.\n\n## Examples\n\nIn the example below we register the current process under the same\nkey in a duplicate registry but with different values:\n\n    iex> Registry.start_link(keys: :duplicate, name: Registry.MatchTest)\n    iex> {:ok, _} = Registry.register(Registry.MatchTest, "hello", {1, :atom, 1})\n    iex> {:ok, _} = Registry.register(Registry.MatchTest, "hello", {2, :atom, 2})\n    iex> Registry.match(Registry.MatchTest, "hello", {1, :_, :_})\n    [{self(), {1, :atom, 1}}]\n    iex> Registry.match(Registry.MatchTest, "hello", {2, :_, :_})\n    [{self(), {2, :atom, 2}}]\n    iex> Registry.match(Registry.MatchTest, "hello", {:_, :atom, :_}) |> Enum.sort()\n    [{self(), {1, :atom, 1}}, {self(), {2, :atom, 2}}]\n    iex> Registry.match(Registry.MatchTest, "hello", {:"$1", :_, :"$1"}) |> Enum.sort()\n    [{self(), {1, :atom, 1}}, {self(), {2, :atom, 2}}]\n    iex> guards = [{:>, :"$1", 1}]\n    iex> Registry.match(Registry.MatchTest, "hello", {:_, :_, :"$1"}, guards)\n    [{self(), {2, :atom, 2}}]\n    iex> guards = [{:is_atom, :"$1"}]\n    iex> Registry.match(Registry.MatchTest, "hello", {:_, :"$1", :_}, guards) |> Enum.sort()\n    [{self(), {1, :atom, 1}}, {self(), {2, :atom, 2}}]\n\n',
    },
    {
      name: "lookup/2",
      type: "function",
      specs: ["@spec lookup(registry(), key()) :: [{pid(), value()}]"],
      documentation:
        'Finds the `{pid, value}` pair for the given `key` in `registry` in no particular order.\n\nAn empty list if there is no match.\n\nFor unique registries, a single partition lookup is necessary. For\nduplicate registries, all partitions must be looked up.\n\n## Examples\n\nIn the example below we register the current process and look it up\nboth from itself and other processes:\n\n    iex> Registry.start_link(keys: :unique, name: Registry.UniqueLookupTest)\n    iex> Registry.lookup(Registry.UniqueLookupTest, "hello")\n    []\n    iex> {:ok, _} = Registry.register(Registry.UniqueLookupTest, "hello", :world)\n    iex> Registry.lookup(Registry.UniqueLookupTest, "hello")\n    [{self(), :world}]\n    iex> Task.async(fn -> Registry.lookup(Registry.UniqueLookupTest, "hello") end) |> Task.await()\n    [{self(), :world}]\n\nThe same applies to duplicate registries:\n\n    iex> Registry.start_link(keys: :duplicate, name: Registry.DuplicateLookupTest)\n    iex> Registry.lookup(Registry.DuplicateLookupTest, "hello")\n    []\n    iex> {:ok, _} = Registry.register(Registry.DuplicateLookupTest, "hello", :world)\n    iex> Registry.lookup(Registry.DuplicateLookupTest, "hello")\n    [{self(), :world}]\n    iex> {:ok, _} = Registry.register(Registry.DuplicateLookupTest, "hello", :another)\n    iex> Enum.sort(Registry.lookup(Registry.DuplicateLookupTest, "hello"))\n    [{self(), :another}, {self(), :world}]\n\n',
    },
    {
      name: "keys/2",
      type: "function",
      specs: ["@spec keys(registry(), pid()) :: [key()]"],
      documentation:
        'Returns the known keys for the given `pid` in `registry` in no particular order.\n\nIf the registry is unique, the keys are unique. Otherwise\nthey may contain duplicates if the process was registered\nunder the same key multiple times. The list will be empty\nif the process is dead or it has no keys in this registry.\n\n## Examples\n\nRegistering under a unique registry does not allow multiple entries:\n\n    iex> Registry.start_link(keys: :unique, name: Registry.UniqueKeysTest)\n    iex> Registry.keys(Registry.UniqueKeysTest, self())\n    []\n    iex> {:ok, _} = Registry.register(Registry.UniqueKeysTest, "hello", :world)\n    iex> Registry.register(Registry.UniqueKeysTest, "hello", :later) # registry is :unique\n    {:error, {:already_registered, self()}}\n    iex> Registry.keys(Registry.UniqueKeysTest, self())\n    ["hello"]\n\nSuch is possible for duplicate registries though:\n\n    iex> Registry.start_link(keys: :duplicate, name: Registry.DuplicateKeysTest)\n    iex> Registry.keys(Registry.DuplicateKeysTest, self())\n    []\n    iex> {:ok, _} = Registry.register(Registry.DuplicateKeysTest, "hello", :world)\n    iex> {:ok, _} = Registry.register(Registry.DuplicateKeysTest, "hello", :world)\n    iex> Registry.keys(Registry.DuplicateKeysTest, self())\n    ["hello", "hello"]\n\n',
    },
    {
      name: "dispatch/4",
      type: "function",
      specs: [
        "@spec dispatch(registry(), key(), dispatcher, keyword()) :: :ok\n      when dispatcher:\n             (entries :: [{pid(), value()}] -> term())\n             | {module(), atom(), [any()]}",
      ],
      documentation:
        "Invokes the callback with all entries under `key` in each partition\nfor the given `registry`.\n\nThe list of `entries` is a non-empty list of two-element tuples where\nthe first element is the PID and the second element is the value\nassociated to the PID. If there are no entries for the given key,\nthe callback is never invoked.\n\nIf the registry is partitioned, the callback is invoked multiple times\nper partition. If the registry is partitioned and `parallel: true` is\ngiven as an option, the dispatching happens in parallel. In both cases,\nthe callback is only invoked if there are entries for that partition.\n\nSee the module documentation for examples of using the `dispatch/3`\nfunction for building custom dispatching or a pubsub system.\n",
    },
    {
      name: "delete_meta/2",
      type: "function",
      specs: ["@spec delete_meta(registry(), meta_key()) :: :ok"],
      documentation:
        'Deletes registry metadata for the given `key` in `registry`.\n\n## Examples\n\n    iex> Registry.start_link(keys: :unique, name: Registry.DeleteMetaTest)\n    iex> Registry.put_meta(Registry.DeleteMetaTest, :custom_key, "custom_value")\n    :ok\n    iex> Registry.meta(Registry.DeleteMetaTest, :custom_key)\n    {:ok, "custom_value"}\n    iex> Registry.delete_meta(Registry.DeleteMetaTest, :custom_key)\n    :ok\n    iex> Registry.meta(Registry.DeleteMetaTest, :custom_key)\n    :error\n\n',
    },
    {
      name: "count_select/2",
      type: "function",
      specs: ["@spec count_select(registry(), spec()) :: non_neg_integer()"],
      documentation:
        'Works like `select/2`, but only returns the number of matching records.\n\n## Examples\n\nIn the example below we register the current process under different\nkeys in a unique registry but with the same value:\n\n    iex> Registry.start_link(keys: :unique, name: Registry.CountSelectTest)\n    iex> {:ok, _} = Registry.register(Registry.CountSelectTest, "hello", :value)\n    iex> {:ok, _} = Registry.register(Registry.CountSelectTest, "world", :value)\n    iex> Registry.count_select(Registry.CountSelectTest, [{{:_, :_, :value}, [], [true]}])\n    2\n',
    },
    {
      name: "count_match/4",
      type: "function",
      specs: [
        "@spec count_match(registry(), key(), match_pattern(), guards()) ::\n        non_neg_integer()",
      ],
      documentation:
        'Returns the number of `{pid, value}` pairs under the given `key` in `registry`\nthat match `pattern`.\n\nPattern must be an atom or a tuple that will match the structure of the\nvalue stored in the registry. The atom `:_` can be used to ignore a given\nvalue or tuple element, while the atom `:"$1"` can be used to temporarily assign part\nof pattern to a variable for a subsequent comparison.\n\nOptionally, it is possible to pass a list of guard conditions for more precise matching.\nEach guard is a tuple, which describes checks that should be passed by assigned part of pattern.\nFor example the `$1 > 1` guard condition would be expressed as the `{:>, :"$1", 1}` tuple.\nPlease note that guard conditions will work only for assigned\nvariables like `:"$1"`, `:"$2"`, and so forth.\nAvoid usage of special match variables `:"$_"` and `:"$$"`, because it might not work as expected.\n\nZero will be returned if there is no match.\n\nFor unique registries, a single partition lookup is necessary. For\nduplicate registries, all partitions must be looked up.\n\n## Examples\n\nIn the example below we register the current process under the same\nkey in a duplicate registry but with different values:\n\n    iex> Registry.start_link(keys: :duplicate, name: Registry.CountMatchTest)\n    iex> {:ok, _} = Registry.register(Registry.CountMatchTest, "hello", {1, :atom, 1})\n    iex> {:ok, _} = Registry.register(Registry.CountMatchTest, "hello", {2, :atom, 2})\n    iex> Registry.count_match(Registry.CountMatchTest, "hello", {1, :_, :_})\n    1\n    iex> Registry.count_match(Registry.CountMatchTest, "hello", {2, :_, :_})\n    1\n    iex> Registry.count_match(Registry.CountMatchTest, "hello", {:_, :atom, :_})\n    2\n    iex> Registry.count_match(Registry.CountMatchTest, "hello", {:"$1", :_, :"$1"})\n    2\n    iex> Registry.count_match(Registry.CountMatchTest, "hello", {:_, :_, :"$1"}, [{:>, :"$1", 1}])\n    1\n    iex> Registry.count_match(Registry.CountMatchTest, "hello", {:_, :"$1", :_}, [{:is_atom, :"$1"}])\n    2\n\n',
    },
    {
      name: "count/1",
      type: "function",
      specs: ["@spec count(registry()) :: non_neg_integer()"],
      documentation:
        'Returns the number of registered keys in a registry.\nIt runs in constant time.\n\n## Examples\nIn the example below we register the current process and ask for the\nnumber of keys in the registry:\n\n    iex> Registry.start_link(keys: :unique, name: Registry.UniqueCountTest)\n    iex> Registry.count(Registry.UniqueCountTest)\n    0\n    iex> {:ok, _} = Registry.register(Registry.UniqueCountTest, "hello", :world)\n    iex> {:ok, _} = Registry.register(Registry.UniqueCountTest, "world", :world)\n    iex> Registry.count(Registry.UniqueCountTest)\n    2\n\nThe same applies to duplicate registries:\n\n    iex> Registry.start_link(keys: :duplicate, name: Registry.DuplicateCountTest)\n    iex> Registry.count(Registry.DuplicateCountTest)\n    0\n    iex> {:ok, _} = Registry.register(Registry.DuplicateCountTest, "hello", :world)\n    iex> {:ok, _} = Registry.register(Registry.DuplicateCountTest, "hello", :world)\n    iex> Registry.count(Registry.DuplicateCountTest)\n    2\n\n',
    },
    {
      name: "child_spec/1",
      type: "function",
      specs: ["@spec child_spec([start_option()]) :: Supervisor.child_spec()"],
      documentation:
        "Returns a specification to start a registry under a supervisor.\n\nSee `Supervisor`.\n",
    },
  ],
  name: "Registry",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "listener_message/0",
      type: "type",
      specs: [
        "@type listener_message() ::\n        {:register, registry(), key(), registry_partition :: pid(), value()}\n        | {:unregister, registry(), key(), registry_partition :: pid()}",
      ],
      documentation:
        "The message that the registry sends to listeners when a process registers or unregisters.\n\nSee the `:listeners` option in `start_link/1`.\n",
    },
    {
      name: "start_option/0",
      type: "type",
      specs: [
        "@type start_option() ::\n        {:keys, keys()}\n        | {:name, registry()}\n        | {:partitions, pos_integer()}\n        | {:listeners, [atom()]}\n        | {:meta, [{meta_key(), meta_value()}]}",
      ],
      documentation: "Options used for `child_spec/1` and `start_link/1`",
    },
    {
      name: "spec/0",
      type: "type",
      specs: ["@type spec() :: [{match_pattern(), guards(), body()}]"],
      documentation:
        "A full match spec used when selecting objects in the registry",
    },
    {
      name: "body/0",
      type: "type",
      specs: ["@type body() :: [term()]"],
      documentation:
        "A pattern used to representing the output format part of a match spec",
    },
    {
      name: "guards/0",
      type: "type",
      specs: ["@type guards() :: [guard()]"],
      documentation:
        "A list of guards to be evaluated when matching on objects in a registry",
    },
    {
      name: "guard/0",
      type: "type",
      specs: ["@type guard() :: atom() | tuple()"],
      documentation:
        "A guard to be evaluated when matching on objects in a registry",
    },
    {
      name: "match_pattern/0",
      type: "type",
      specs: ["@type match_pattern() :: atom() | term()"],
      documentation: "A pattern to match on objects in a registry",
    },
    {
      name: "meta_value/0",
      type: "type",
      specs: ["@type meta_value() :: term()"],
      documentation: "The type of registry metadata values",
    },
    {
      name: "meta_key/0",
      type: "type",
      specs: ["@type meta_key() :: atom() | tuple()"],
      documentation: "The type of registry metadata keys",
    },
    {
      name: "value/0",
      type: "type",
      specs: ["@type value() :: term()"],
      documentation: "The type of values allowed on registration",
    },
    {
      name: "key/0",
      type: "type",
      specs: ["@type key() :: term()"],
      documentation: "The type of keys allowed on registration",
    },
    {
      name: "keys/0",
      type: "type",
      specs: ["@type keys() :: :unique | :duplicate"],
      documentation: "The type of the registry",
    },
    {
      name: "registry/0",
      type: "type",
      specs: ["@type registry() :: atom()"],
      documentation: "The registry identifier",
    },
  ],
};
