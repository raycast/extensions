-- Installed and managed by Rime Manager for Raycast.
--
-- A lowered rule keeps the matching candidate visible, but moves it behind
-- the first three non-matching candidates. This follows the behavior of
-- rime-ice's cold_word_drop filter and never deletes the matching candidate.

local M = {}

local function normalize(value)
  return (value or ""):gsub("%s+", "")
end

local function matching_rule_key(candidate, context, rules)
  local text = normalize(candidate.text)
  local preedit_key = text .. "\0" .. normalize(candidate.preedit)
  if rules[preedit_key] then return preedit_key end
  local input_key = text .. "\0" .. normalize(context.input)
  if rules[input_key] then return input_key end
  return nil
end

local function load_rules()
  local rules = {}
  local path = rime_api.get_user_data_dir() .. "/raycast_lowered_words.txt"
  local file = io.open(path, "r")
  if not file then return rules end

  for line in file:lines() do
    line = line:gsub("^\239\187\191", "")
    if line ~= "" and not line:match("^#") then
      local word, code = line:match("([^\t]+)\t(.+)")
      word = normalize(word)
      code = normalize(code)
      if word ~= "" and code ~= "" then rules[word .. "\0" .. code] = true end
    end
  end
  file:close()
  return rules
end

function M.init(env)
  env.raycast_lowered_rules = load_rules()
  local config = env.engine.schema.config
  env.name_space = env.name_space:gsub("^*", "")
  env.raycast_lowered_index = config:get_int(env.name_space .. "/idx") or 4
end

local function lower_candidates(buffered, rules, context, target_index)
  local normal, lowered = {}, {}
  local first_lowered_index = nil
  for index, candidate in ipairs(buffered) do
    if matching_rule_key(candidate, context, rules) then
      table.insert(lowered, candidate)
      first_lowered_index = first_lowered_index or index
    else
      table.insert(normal, candidate)
    end
  end

  if #lowered == 0 then return buffered end

  -- Never promote a candidate that was already below the target position.
  local insertion_index = math.max(target_index, first_lowered_index or target_index)
  insertion_index = math.min(insertion_index, #normal + 1)
  local ordered = {}
  for index = 1, insertion_index - 1 do table.insert(ordered, normal[index]) end
  for _, candidate in ipairs(lowered) do table.insert(ordered, candidate) end
  for index = insertion_index, #normal do table.insert(ordered, normal[index]) end
  return ordered
end

function M.func(input, env)
  local rules = env.raycast_lowered_rules
  if not rules or next(rules) == nil then
    for candidate in input:iter() do yield(candidate) end
    return
  end

  local context = env.engine.context
  local target_index = math.max(2, env.raycast_lowered_index or 4)
  local buffered = {}
  local flushed = false
  for candidate in input:iter() do
    if flushed then
      yield(candidate)
    else
      table.insert(buffered, candidate)
      if #buffered >= 180 then
        for _, lowered in ipairs(lower_candidates(buffered, rules, context, target_index)) do yield(lowered) end
        flushed = true
      end
    end
  end

  if not flushed then
    for _, lowered in ipairs(lower_candidates(buffered, rules, context, target_index)) do yield(lowered) end
  end
end

return M
