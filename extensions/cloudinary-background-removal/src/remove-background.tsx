import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
  Icon,
  popToRoot,
} from '@raycast/api'
import React, { useState, useEffect, useCallback } from 'react'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { homedir, tmpdir } from 'os'

const execAsync = promisify(exec)

// Log file for diagnostics
const LOG_FILE = path.join(homedir(), 'cloudinary-upload-debug.log')

// Helper to write logs to both console and file
const logToFile = async (message: string) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  console.log(message) // Also log to console
  try {
    await fs.appendFile(LOG_FILE, logMessage)
  } catch (error) {
    // Ignore file write errors - console logging is more important
  }
}

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB (Cloudinary free tier limit)
const MAX_FILE_SIZE_BEFORE_COMPRESSION = 100 * 1024 * 1024 // 100MB (Cloudinary max)
const COMPRESSION_SIZE = 2000 // Max dimension in pixels
const PROCESSING_TIMEOUT = 120000 // 120 seconds

const SUPPORTED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.tiff',
]
const VALID_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
]

interface Preferences {
  cloudName: string
  uploadPreset: string
  outputDirectory: string
}

interface ProcessingState {
  status:
    | 'idle'
    | 'validating'
    | 'compressing'
    | 'uploading'
    | 'processing'
    | 'downloading'
    | 'saving'
    | 'complete'
    | 'error'
  message: string
  outputPath?: string
}

interface CloudinaryUploadResponse {
  public_id: string
  secure_url?: string
  url?: string
  error?: {
    message: string
  }
}

export default function RemoveBackground() {
  const preferences = getPreferenceValues<Preferences>()
  const { push } = useNavigation()
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [processing, setProcessing] = useState<ProcessingState>({
    status: 'idle',
    message: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [preferencesValid, setPreferencesValid] = useState(false)
  const [tempFiles, setTempFiles] = useState<string[]>([])

  // Auto-detect selected file from Finder on mount
  useEffect(() => {
    const autoDetectFile = async () => {
      if (!selectedFile) {
        const file = await getSelectedFile()
        if (file) {
          setSelectedFile(file)
        }
      }
    }
    autoDetectFile()
  }, []) // Only run on mount

  // Auto-submit when file is detected and preferences are valid (only once)
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false)
  useEffect(() => {
    if (
      selectedFile &&
      preferencesValid &&
      !isLoading &&
      processing.status === 'idle' &&
      !hasAutoSubmitted
    ) {
      // Auto-submit if we have a file, valid preferences, and we haven't auto-submitted yet
      setHasAutoSubmitted(true)
      handleSubmit()
    }
  }, [selectedFile, preferencesValid]) // Run when file or preferences change

  // Validate preferences on mount and when they change
  useEffect(() => {
    const validatePreferences = () => {
      const cloudNameValid =
        preferences.cloudName && preferences.cloudName.trim() !== ''
      const uploadPresetValid =
        preferences.uploadPreset && preferences.uploadPreset.trim() !== ''
      setPreferencesValid(!!(cloudNameValid && uploadPresetValid))
    }
    validatePreferences()
  }, [preferences])

  // Cleanup temp files on unmount
  useEffect(() => {
    return () => {
      // Note: Cleanup in useEffect must be synchronous
      // We handle async cleanup in the error handlers and success paths
      // This is just a safety net for component unmount
      tempFiles.forEach((tempFile: string) => {
        // Fire and forget - can't await in cleanup
        fs.unlink(tempFile).catch(() => {
          // Ignore cleanup errors
        })
      })
    }
  }, [tempFiles])

  // ==================== SECURITY FUNCTIONS ====================

  /**
   * Properly escape shell arguments to prevent command injection
   * This is CRITICAL for security - from Agent uXTg1
   */
  const escapeShellArg = (arg: string): string => {
    // Replace single quotes with '\'' and wrap in single quotes
    // This is the POSIX-compliant way to escape shell arguments
    return `'${arg.replace(/'/g, "'\\''")}'`
  }

  /**
   * Sanitize file path to prevent directory traversal and remove dangerous characters
   * From Agent uXTg1
   */
  const sanitizePath = (filePath: string): string => {
    // Normalize path and remove dangerous characters
    // eslint-disable-next-line no-control-regex
    return path.normalize(filePath.replace(/[<>:"|?*\x00-\x1f]/g, ''))
  }

  /**
   * Validate cloud name format (alphanumeric, hyphens, underscores only)
   * From Agent Avn2I
   */
  const validateCloudName = (cloudName: string): boolean => {
    return /^[a-zA-Z0-9_-]+$/.test(cloudName)
  }

  /**
   * Sanitize cloud name and upload preset (only allow safe characters)
   * From Agent uXTg1
   */
  const sanitizeCloudName = (cloudName: string): string => {
    return cloudName.trim().replace(/[^a-zA-Z0-9_-]/g, '')
  }

  const sanitizeUploadPreset = (preset: string): string => {
    return preset.trim().replace(/[^a-zA-Z0-9_-]/g, '')
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Resolve output directory (handles ~, relative, and absolute paths)
   * From Agent uXTg1
   */
  const resolveOutputDirectory = (dir: string): string => {
    if (dir.startsWith('~')) {
      return path.join(homedir(), dir.slice(1))
    }
    if (!path.isAbsolute(dir)) {
      return path.resolve(dir)
    }
    return dir
  }

  const fileExists = async (filePath: string): Promise<boolean> => {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  // ==================== FILE SELECTION ====================

  /**
   * Get selected file from Finder
   * Uses useCallback for memoization - from Agent Avn2I
   */
  const getSelectedFile = useCallback(async (): Promise<string | null> => {
    try {
      const { stdout } = await execAsync(
        `osascript -e 'tell application "Finder" to get POSIX path of (selection as alias)'`
      )
      const filePath = stdout.trim()
      if (filePath && (await fileExists(filePath))) {
        return filePath
      }
    } catch (error) {
      // No file selected or error - this is expected if nothing is selected
    }
    return null
  }, [])

  // ==================== FILE VALIDATION ====================

  /**
   * Comprehensive image validation
   * Combines best from all agents: MIME type checking (AYocw), file size (AYocw), extension check (uXTg1)
   */
  const validateImage = async (
    filePath: string
  ): Promise<{ valid: boolean; error?: string }> => {
    try {
      // 1. Check if file exists
      if (!(await fileExists(filePath))) {
        return { valid: false, error: 'File does not exist' }
      }

      // 2. Check file extension
      const ext = path.extname(filePath).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        return {
          valid: false,
          error: `Unsupported file format. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
        }
      }

      // 3. Check MIME type using file command (more reliable than extension) - from Agent AYocw
      try {
        const { stdout } = await execAsync(
          `file -b --mime-type ${escapeShellArg(filePath)}`
        )
        const mimeType = stdout.trim().toLowerCase()
        if (!VALID_MIME_TYPES.includes(mimeType)) {
          return {
            valid: false,
            error: `Unsupported image format: ${mimeType}`,
          }
        }
      } catch {
        // If file command fails, still allow if extension is valid
      }

      // 4. Check file size - from Agent AYocw
      const stats = await fs.stat(filePath)
      if (stats.size === 0) {
        return { valid: false, error: 'File is empty' }
      }
      if (stats.size > MAX_FILE_SIZE_BEFORE_COMPRESSION) {
        return {
          valid: false,
          error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max ${MAX_FILE_SIZE_BEFORE_COMPRESSION / 1024 / 1024}MB before compression)`,
        }
      }

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : 'Unknown validation error',
      }
    }
  }

  // ==================== IMAGE COMPRESSION ====================

  /**
   * Compress image if too large
   * Uses proper shell escaping - from Agent uXTg1
   */
  const compressImage = async (filePath: string): Promise<string> => {
    const ext = path.extname(filePath).slice(1) || 'jpg'
    const tempFile = path.join(
      tmpdir(),
      `cloudinary_compressed_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
    )

    // Track temp file for cleanup
    setTempFiles((prev: string[]) => [...prev, tempFile])

    try {
      // Use proper shell escaping - CRITICAL for security
      const escapedInput = escapeShellArg(filePath)
      const escapedOutput = escapeShellArg(tempFile)

      await execAsync(
        `sips -Z ${COMPRESSION_SIZE} ${escapedInput} --out ${escapedOutput}`
      )

      // Verify compressed file exists and is valid
      if (await fileExists(tempFile)) {
        const stats = await fs.stat(tempFile)
        if (stats.size > 0) {
          return tempFile
        }
      }
      throw new Error('Compression failed: output file is invalid')
    } catch (error) {
      // Clean up failed temp file
      try {
        if (await fileExists(tempFile)) {
          await fs.unlink(tempFile).catch(() => {})
        }
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(
        `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // ==================== CLOUDINARY UPLOAD ====================

  /**
   * Upload image to Cloudinary using curl
   * Uses curl (most reliable) with proper shell escaping - consensus from Avn2I, AYocw, uXTg1
   * DIAGNOSTIC VERSION: Enhanced logging and error detection
   */
  const uploadToCloudinary = async (filePath: string): Promise<string> => {
    // Validate preferences
    if (!preferences.cloudName || preferences.cloudName.trim() === '') {
      throw new Error(
        'Cloudinary cloud name is not configured. Please set it in preferences.'
      )
    }

    if (!preferences.uploadPreset || preferences.uploadPreset.trim() === '') {
      throw new Error(
        'Upload preset is not configured. Please set it in preferences.'
      )
    }

    // Sanitize inputs - CRITICAL for security - from Agent uXTg1
    const cloudName = sanitizeCloudName(preferences.cloudName)
    const uploadPreset = sanitizeUploadPreset(preferences.uploadPreset)

    if (!cloudName) {
      throw new Error('Invalid cloud name - contains only invalid characters')
    }
    if (!uploadPreset) {
      throw new Error(
        'Invalid upload preset - contains only invalid characters'
      )
    }

    // Validate cloud name format - from Agent Avn2I
    if (!validateCloudName(cloudName)) {
      throw new Error(
        'Cloud name can only contain letters, numbers, hyphens, and underscores'
      )
    }

    // Verify file exists and get size for diagnostics
    let fileSize = 0
    try {
      const stats = await fs.stat(filePath)
      fileSize = stats.size
    } catch (error) {
      throw new Error(`File not found: ${filePath}`)
    }

    // DIAGNOSTIC: Log file info (to both console and file)
    const fileExt = path.extname(filePath).toLowerCase()
    const fileName = path.basename(filePath)
    await logToFile(`[UPLOAD] ========================================`)
    await logToFile(`[UPLOAD] Starting upload`)
    await logToFile(`[UPLOAD] File: ${fileName}`)
    await logToFile(`[UPLOAD] Full path: ${filePath}`)
    await logToFile(
      `[UPLOAD] File size: ${(fileSize / 1024).toFixed(2)} KB (${fileSize} bytes)`
    )
    await logToFile(`[UPLOAD] File extension: ${fileExt}`)
    await logToFile(`[UPLOAD] Cloud name: ${cloudName}`)
    await logToFile(`[UPLOAD] Upload preset: ${uploadPreset}`)

    // Check for potential issues
    const hasSpaces = filePath.includes(' ')
    const hasSpecialChars = /[^a-zA-Z0-9_\-./]/.test(filePath)
    await logToFile(`[UPLOAD] Path has spaces: ${hasSpaces}`)
    await logToFile(`[UPLOAD] Path has special chars: ${hasSpecialChars}`)

    // Use curl with proper path handling
    // Strategy: The path goes inside -F "file=@path" double quotes
    // Inside double quotes, we only need to escape: ", $, `, and \
    // Spaces are fine inside double quotes - no escaping needed!
    const escapeForDoubleQuotes = (p: string): string => {
      // Escape only characters that break double-quoted strings
      return p
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/"/g, '\\"') // Escape double quotes
        .replace(/\$/g, '\\$') // Escape dollar signs
        .replace(/`/g, '\\`') // Escape backticks
      // Note: Spaces, parentheses, etc. are fine inside double quotes
    }

    const escapedFilePath = escapeForDoubleQuotes(filePath)
    const escapedUploadPreset = escapeForDoubleQuotes(uploadPreset)

    // Build curl command - path is inside -F "file=@path" double quotes
    // NO single quotes around the path - curl treats them as part of filename!
    const curlCommand = `curl -s -X POST "https://api.cloudinary.com/v1_1/${cloudName}/image/upload" -F "file=@${escapedFilePath}" -F "upload_preset=${escapedUploadPreset}" --max-time 120 --connect-timeout 30 --show-error`

    // DIAGNOSTIC: Log the command (sanitized for security)
    await logToFile(
      `[UPLOAD] Curl command (sanitized): curl -s -X POST "https://api.cloudinary.com/v1_1/${cloudName}/image/upload" -F "file=@[FILE_PATH]" -F "upload_preset=${uploadPreset}" --max-time 120 --connect-timeout 30 --show-error`
    )
    await logToFile(
      `[UPLOAD] Escaped file path length: ${escapedFilePath.length} chars (original: ${filePath.length} chars)`
    )

    const startTime = Date.now()

    try {
      // Use execAsync with generous timeout
      // Increased timeout to 150 seconds total (120s curl + 30s buffer)
      const { stdout, stderr } = await execAsync(curlCommand, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
        timeout: 150000, // 150 seconds total timeout
      })

      const elapsedTime = Date.now() - startTime
      await logToFile(
        `[UPLOAD] ✅ Upload completed successfully in ${(elapsedTime / 1000).toFixed(2)}s`
      )
      await logToFile(`[UPLOAD] ========================================`)

      // DIAGNOSTIC: Log response info
      if (stderr && stderr.trim() !== '') {
        await logToFile(`[UPLOAD] stderr: ${stderr.substring(0, 500)}`)
      }
      await logToFile(`[UPLOAD] Response length: ${stdout.length} bytes`)
      await logToFile(`[UPLOAD] Response preview: ${stdout.substring(0, 200)}`)

      // Check stderr - curl --show-error will put errors here
      if (stderr && stderr.trim() !== '') {
        // Some curl warnings are OK, but actual errors should be thrown
        if (stderr.includes('curl:') || stderr.includes('error')) {
          throw new Error(`Upload error: ${stderr}`)
        }
      }

      if (!stdout || stdout.trim() === '') {
        throw new Error('Empty response from Cloudinary')
      }

      let data: CloudinaryUploadResponse
      try {
        data = JSON.parse(stdout) as CloudinaryUploadResponse
      } catch (parseError) {
        await logToFile(`[UPLOAD] JSON parse error. Full response: ${stdout}`)
        throw new Error(
          `Invalid JSON response from Cloudinary: ${stdout.substring(0, 200)}`
        )
      }

      if (data.error) {
        await logToFile(
          `[UPLOAD] Cloudinary API error: ${JSON.stringify(data.error)}`
        )
        throw new Error(
          `Cloudinary error: ${data.error.message || JSON.stringify(data.error)}`
        )
      }

      if (!data.public_id) {
        await logToFile(
          `[UPLOAD] Missing public_id. Full response: ${JSON.stringify(data)}`
        )
        throw new Error('Upload succeeded but no public_id returned')
      }

      await logToFile(`[UPLOAD] Success! Public ID: ${data.public_id}`)
      return data.public_id
    } catch (error) {
      const elapsedTime = Date.now() - startTime
      await logToFile(
        `[UPLOAD] ❌ Upload failed after ${(elapsedTime / 1000).toFixed(2)}s`
      )

      if (error instanceof Error) {
        await logToFile(`[UPLOAD] Error type: ${error.constructor.name}`)
        await logToFile(`[UPLOAD] Error message: ${error.message}`)
        if (error.stack) {
          await logToFile(
            `[UPLOAD] Error stack (first 500 chars): ${error.stack.substring(0, 500)}`
          )
        }
        await logToFile(`[UPLOAD] ========================================`)

        // Check for specific error types
        if (
          error.message.includes('ENOENT') ||
          error.message.includes('No such file')
        ) {
          throw new Error('File not found or cannot be accessed')
        }

        // Check for timeout - be more specific about what timed out
        if (
          error.message.includes('timeout') ||
          error.message.includes('max-time') ||
          error.message.includes('ETIMEDOUT')
        ) {
          // Check if it's execAsync timeout or curl timeout
          if (elapsedTime >= 145000) {
            throw new Error(
              `Upload timeout after ${(elapsedTime / 1000).toFixed(0)}s - execAsync timeout reached`
            )
          } else {
            throw new Error(
              `Upload timeout after ${(elapsedTime / 1000).toFixed(0)}s - curl timeout reached (file: ${(fileSize / 1024).toFixed(1)}KB)`
            )
          }
        }

        if (error.message.includes('401') || error.message.includes('403')) {
          throw new Error(
            'Authentication error: Check your cloud name and upload preset'
          )
        }
        if (error.message.includes('404')) {
          throw new Error(
            'Cloud name not found. Please verify your Cloudinary cloud name'
          )
        }

        // Re-throw with diagnostic info
        throw new Error(
          `${error.message} (after ${(elapsedTime / 1000).toFixed(1)}s, file: ${(fileSize / 1024).toFixed(1)}KB)`
        )
      }
      throw new Error('Unknown error during upload')
    }
  }

  // ==================== BACKGROUND REMOVAL ====================

  /**
   * Remove background using Cloudinary transformation
   * Uses AbortController for timeout - from Agent Avn2I
   */
  const removeBackground = async (
    publicId: string,
    method: string,
    methodLabel: string
  ): Promise<Buffer> => {
    const cloudName = sanitizeCloudName(preferences.cloudName)
    // Cloudinary public_id can contain slashes (for folders), dots, hyphens, underscores
    // We trust Cloudinary's response, but ensure no truly dangerous characters
    // Cloudinary URLs use public_id directly in path - no URL encoding needed
    // Only remove characters that could break URL structure (not alphanumeric, /, _, -, .)
    const sanitizedPublicId = publicId.replace(/[^a-zA-Z0-9_\-./]/g, '')
    const sanitizedMethod = method.replace(/[^a-zA-Z0-9_:]/g, '') // Sanitize method

    const url = `https://res.cloudinary.com/${cloudName}/image/upload/${sanitizedMethod}/f_png/${sanitizedPublicId}.png`

    try {
      // Use AbortController for timeout - from Agent Avn2I
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), PROCESSING_TIMEOUT)

      const response = await fetch(url, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Handle 423 (Processing) - Cloudinary might need time - from Agent Avn2I
        if (response.status === 423) {
          throw new Error(
            'Background removal is processing, please try again in a few seconds'
          )
        }

        // Check if it's an error page (HTML) - from Agent AYocw
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('text/html')) {
          throw new Error(
            `Background removal method "${methodLabel}" not available or failed`
          )
        }

        throw new Error(
          `Background removal failed (${response.status}): ${response.statusText}`
        )
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Validate result - from Agent Avn2I
      if (buffer.length === 0) {
        throw new Error('Received empty response from Cloudinary')
      }

      // Check if it's a valid PNG (starts with PNG signature) - from Agent Avn2I
      const pngSignature = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ])
      const bufferHeader = new Uint8Array(buffer.subarray(0, 8))
      const isPng =
        bufferHeader.length === pngSignature.length &&
        bufferHeader.every((byte, i) => byte === pngSignature[i])

      // Check if it might be an HTML error page - from Agent Avn2I
      const bufferStart = buffer
        .subarray(0, 100)
        .toString('utf-8')
        .toLowerCase()
      if (
        bufferStart.includes('<html') ||
        bufferStart.includes('error') ||
        bufferStart.includes('not found')
      ) {
        throw new Error('Received error page instead of image')
      }

      // Minimum size validation - from Agent AYocw
      if (!isPng && buffer.length < 1000) {
        throw new Error(
          `Invalid response: ${buffer.toString('utf-8').substring(0, 200)}`
        )
      }

      return buffer
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            'Background removal timeout - processing took too long'
          )
        }
        throw error
      }
      throw new Error('Background removal failed: Unknown error')
    }
  }

  /**
   * Try background removal with three-tier fallback
   * Better error aggregation - from Agent AYocw
   */
  const tryBackgroundRemoval = async (publicId: string): Promise<Buffer> => {
    const methods = [
      { code: 'e_background_removal', label: 'AI Background Removal' },
      { code: 'e_bgremoval:auto', label: 'Auto-detect Background' },
      { code: 'e_make_transparent', label: 'Edge-based Removal' },
    ]

    const errors: string[] = []

    for (const method of methods) {
      try {
        setProcessing({
          status: 'processing',
          message: `Trying ${method.label}...`,
        })

        const result = await removeBackground(
          publicId,
          method.code,
          method.label
        )

        // Validate result size - from Agent AYocw
        if (result.length > 1000) {
          // Minimum reasonable size for an image
          return result
        } else {
          errors.push(`${method.label}: Result too small (likely failed)`)
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${method.label}: ${errorMsg}`)
        // Continue to next method
        continue
      }
    }

    throw new Error(
      `All background removal methods failed:\n${errors.join('\n')}`
    )
  }

  // ==================== TEMP FILE CLEANUP ====================

  /**
   * Cleanup temporary files
   * From Agent AYocw
   */
  const cleanupTempFiles = async (filePaths: string[]): Promise<void> => {
    const tmpDir = tmpdir()
    for (const filePath of filePaths) {
      try {
        if ((await fileExists(filePath)) && filePath.includes(tmpDir)) {
          await fs.unlink(filePath).catch(() => {
            // Ignore cleanup errors
          })
        }
      } catch {
        // Ignore errors
      }
    }
  }

  // ==================== MAIN HANDLER ====================

  const handleSubmit = async () => {
    if (isLoading) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Already processing',
        message: 'Please wait for the current operation to complete',
      })
      return
    }

    // Validate preferences
    if (!preferencesValid) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Configuration Error',
        message: 'Please set your Cloudinary cloud name in preferences',
      })
      return
    }

    if (!selectedFile || selectedFile.trim() === '') {
      await showToast({
        style: Toast.Style.Failure,
        title: 'No file selected',
        message: 'Please select an image file',
      })
      return
    }

    setIsLoading(true)
    const currentTempFiles: string[] = []
    let imagePath = selectedFile

    try {
      // Sanitize file path - from Agent uXTg1
      imagePath = sanitizePath(selectedFile)

      // Validate file
      setProcessing({ status: 'validating', message: 'Validating image...' })
      const validation = await validateImage(imagePath)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid image file')
      }

      // Check file size and compress if needed
      const fileSize = (await fs.stat(imagePath)).size
      if (fileSize > MAX_FILE_SIZE) {
        setProcessing({
          status: 'compressing',
          message: `Compressing image (${(fileSize / 1024 / 1024).toFixed(2)}MB)...`,
        })
        const compressedPath = await compressImage(imagePath)
        currentTempFiles.push(compressedPath)
        imagePath = compressedPath
      }

      // Upload to Cloudinary
      setProcessing({
        status: 'uploading',
        message: 'Uploading to Cloudinary...',
      })
      const publicId = await uploadToCloudinary(imagePath)

      // Remove background
      setProcessing({
        status: 'processing',
        message: 'Removing background (this may take a moment)...',
      })
      const processedImage = await tryBackgroundRemoval(publicId)

      // Save to output directory
      setProcessing({
        status: 'saving',
        message: 'Saving image...',
      })

      const outputDir = resolveOutputDirectory(
        preferences.outputDirectory || '~/Downloads'
      )

      // Ensure output directory exists
      try {
        await fs.mkdir(outputDir, { recursive: true })
      } catch (error) {
        throw new Error(`Cannot create output directory: ${outputDir}`)
      }

      // Generate unique filename - sanitize basename - from Agent uXTg1
      const basename = path.basename(imagePath, path.extname(imagePath))
      // eslint-disable-next-line no-control-regex
      const sanitizedBasename = basename.replace(/[<>:"|?*\x00-\x1f]/g, '_')
      let outputPath = path.join(
        outputDir,
        `${sanitizedBasename}_no_background.png`
      )
      let counter = 1
      while (await fileExists(outputPath)) {
        outputPath = path.join(
          outputDir,
          `${sanitizedBasename}_no_background_${counter}.png`
        )
        counter++
      }

      await fs.writeFile(outputPath, new Uint8Array(processedImage))

      // Verify file was written - from Agent tVpDJ
      const writtenStats = await fs.stat(outputPath)
      if (writtenStats.size === 0) {
        throw new Error('Failed to save processed image - file is empty')
      }

      // Clean up temp files
      await cleanupTempFiles(currentTempFiles)
      setTempFiles([])

      // Open in Preview
      try {
        await execAsync(`open -a Preview ${escapeShellArg(outputPath)}`)
      } catch {
        // Ignore if Preview fails to open - file is still saved
      }

      setProcessing({
        status: 'complete',
        message: 'Background removed successfully!',
        outputPath,
      })

      await showToast({
        style: Toast.Style.Success,
        title: 'Success!',
        message: `Saved to ${path.basename(outputPath)}`,
      })

      // Show result - with file size from Agent tVpDJ
      push(
        <Detail
          markdown={`# Background Removal Complete! ✅\n\n**Image saved to:**\n\`${outputPath}\`\n\n**File size:** ${(writtenStats.size / 1024).toFixed(1)} KB\n\nPreview should open automatically.`}
          actions={
            <ActionPanel>
              <Action
                title="Done"
                icon={Icon.Check}
                onAction={() => {
                  // Reset state and close
                  setSelectedFile('')
                  setProcessing({ status: 'idle', message: '' })
                  setHasAutoSubmitted(false)
                  popToRoot()
                }}
              />
              <Action.ShowInFinder path={outputPath} title="Show in Finder" />
              <Action.Open title="Open in Preview" target={outputPath} />
              <Action.CopyToClipboard title="Copy Path" content={outputPath} />
            </ActionPanel>
          }
        />
      )

      // Auto-close after 3 seconds if user doesn't interact
      setTimeout(() => {
        setSelectedFile('')
        setProcessing({ status: 'idle', message: '' })
        setHasAutoSubmitted(false)
        popToRoot()
      }, 3000)
    } catch (error) {
      // Clean up temp files on error
      await cleanupTempFiles(currentTempFiles)
      setTempFiles([])

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'

      // Enhanced error message with diagnostic info
      let enhancedErrorMessage = errorMessage

      // Add file info if available
      if (imagePath) {
        try {
          const stats = await fs.stat(imagePath).catch(() => null)
          if (stats) {
            enhancedErrorMessage += `\n\nFile: ${path.basename(imagePath)} (${(stats.size / 1024).toFixed(1)} KB)`
          }
        } catch {
          // Ignore if we can't get file stats
        }
      }

      // Add diagnostic info for upload errors
      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('upload') ||
        errorMessage.includes('Upload')
      ) {
        enhancedErrorMessage += `\n\n📋 Detailed logs saved to:\n${LOG_FILE}`
        enhancedErrorMessage += `\n\n💡 I can read this file to diagnose the issue!`
      }

      setProcessing({
        status: 'error',
        message: enhancedErrorMessage,
      })

      await showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message:
          errorMessage.length > 100
            ? `${errorMessage.substring(0, 100)}...`
            : errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectFile = async () => {
    try {
      const file = await getSelectedFile()
      if (file) {
        setSelectedFile(file)
        await showToast({
          style: Toast.Style.Success,
          title: 'File selected',
          message: path.basename(file),
        })
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: 'No file selected',
          message: 'Please select an image in Finder first',
        })
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to get selected file',
      })
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {!isLoading && selectedFile && preferencesValid && (
            <Action
              title="Remove Background"
              icon={Icon.Wand}
              onAction={handleSubmit}
              shortcut={{ modifiers: ['cmd'], key: 'enter' }}
            />
          )}
          {!isLoading && (
            <Action
              title="Select File from Finder"
              icon={Icon.Folder}
              onAction={handleSelectFile}
              shortcut={{ modifiers: ['cmd'], key: 'f' }}
            />
          )}
          {selectedFile && !isLoading && (
            <Action
              title="Clear Selection"
              icon={Icon.XMarkCircle}
              onAction={() => {
                setSelectedFile('')
                setProcessing({ status: 'idle', message: '' })
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="How to Use"
        text="Select an image in Finder, then open this extension. It will automatically detect and process the selected file. Or manually select a file using ⌘F."
      />
      <Form.TextField
        id="file"
        title="Image File"
        placeholder="/path/to/image.jpg or click button below"
        value={selectedFile}
        onChange={setSelectedFile}
        info="Path to the image file you want to process"
      />

      {selectedFile && (
        <Form.Description
          title="Selected File"
          text={path.basename(selectedFile)}
        />
      )}

      {processing.status !== 'idle' &&
        processing.status !== 'complete' &&
        processing.status !== 'error' && (
          <Form.Description title="Status" text={processing.message} />
        )}

      {processing.status === 'complete' && processing.outputPath && (
        <Form.Description
          title="✅ Complete"
          text={`Image saved to:\n${processing.outputPath}`}
        />
      )}

      {processing.status === 'error' && (
        <>
          <Form.Description title="❌ Error" text={processing.message} />
          <Form.Separator />
          <Form.Description
            title="📋 Detailed Logs Location"
            text={`Logs are automatically saved to:\n${LOG_FILE}\n\nI can read this file directly to diagnose the issue!\n\nJust try uploading again, then I'll check the log file.`}
          />
        </>
      )}

      <Form.Separator />

      <Form.Description
        title="Configuration"
        text={`Cloud Name: ${preferences.cloudName || '⚠️ Not set'}\nUpload Preset: ${preferences.uploadPreset || 'background_removal_preset'}\nOutput Directory: ${preferences.outputDirectory || '~/Downloads'}`}
      />

      {!preferencesValid && (
        <Form.Description
          title="⚠️ Setup Required"
          text="Please configure your Cloudinary cloud name in Raycast preferences (Cmd + , → Extensions → Cloudinary Background Removal)"
        />
      )}
    </Form>
  )
}
