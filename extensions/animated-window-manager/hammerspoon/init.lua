require("hs.ipc")
-- Move window to a reasonable size (30% width, 70% height, centered)
function moveWindowReasonableSize()
  local win = hs.window.focusedWindow()
  if not win then return end

  local screen = win:screen()
  local frame = screen:frame()

  local targetWidth = frame.w * 0.3
  local targetHeight = frame.h * 0.7
  local targetFrame = {
    x = frame.x + ((frame.w - targetWidth) / 2),
    y = frame.y + ((frame.h - targetHeight) / 2),
    w = targetWidth,
    h = targetHeight
  }

  win:move(targetFrame, nil, true, 0.2)
end

-- Move window to the left half
function moveWindowLeftAnimated()
  local win = hs.window.focusedWindow()
  if not win then return end

  local screen = win:screen()
  local frame = screen:frame()

  local targetFrame = {
    x = frame.x,
    y = frame.y,
    w = frame.w / 2,
    h = frame.h
  }

  win:move(targetFrame, nil, true, 0.2)
end

-- Move window to the right half
function moveWindowRightAnimated()
  local win = hs.window.focusedWindow()
  if not win then return end

  local screen = win:screen()
  local frame = screen:frame()

  local targetFrame = {
    x = frame.x + (frame.w / 2),
    y = frame.y,
    w = frame.w / 2,
    h = frame.h
  }

  win:move(targetFrame, nil, true, 0.2)
end

-- Maximize window
function maximizeWindowAnimated()
  local win = hs.window.focusedWindow()
  if not win then return end

  local screen = win:screen()
  local frame = screen:frame()

  win:move(frame, nil, true, 0.2)
end