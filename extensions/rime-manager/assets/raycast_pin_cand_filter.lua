-- Installed and managed by Rime Manager for Raycast.
-- The rules are stored under raycast_pin_cand_filter in <schema>.custom.yaml.

local M = {}

function M.init(env)
  env.raycast_pin_rules = {}
  local rules = env.engine.schema.config:get_list("raycast_pin_cand_filter")
  if not rules then return end

  for index = 0, rules.size - 1 do
    local value = rules:get_value_at(index).value
    local code, words = value:match("([^\t]+)\t(.+)")
    if code and words then
      local normalized_code = code:gsub("%s+", "")
      env.raycast_pin_rules[normalized_code] = {}
      local delimiter = words:find(" > ", 1, true) and " > " or " "
      local pattern = delimiter == " > " and "([^>]+)" or "([^%s]+)"
      for word in words:gmatch(pattern) do
        word = word:gsub("^%s+", ""):gsub("%s+$", "")
        if word ~= "" then table.insert(env.raycast_pin_rules[normalized_code], word) end
      end
    end
  end
end

function M.func(input, env)
  local preedit = env.engine.context:get_preedit().text:gsub("[^a-zA-Z]", "")
  local words = env.raycast_pin_rules[preedit]
  if not words or #words == 0 then
    for candidate in input:iter() do yield(candidate) end
    return
  end

  local order = {}
  for index, word in ipairs(words) do order[word] = index end
  local pinned = {}
  local others = {}
  local inspected = 0
  local flushed = false

  for candidate in input:iter() do
    inspected = inspected + 1
    if flushed then
      yield(candidate)
    else
      local position = order[candidate.text]
      if position and not pinned[position] then
        pinned[position] = candidate
      else
        table.insert(others, candidate)
      end

      if inspected >= 100 then
        for index = 1, #words do if pinned[index] then yield(pinned[index]) end end
        for _, other in ipairs(others) do yield(other) end
        flushed = true
      end
    end
  end

  if not flushed then
    for index = 1, #words do if pinned[index] then yield(pinned[index]) end end
    for _, other in ipairs(others) do yield(other) end
  end
end

return M
