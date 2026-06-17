curl -X POST "http://localhost:8765" \
     -H "Content-Type: application/json" \
     -d '{
         "action": "findModelsByName",
         "version": 6,
         "params": {
             "modelNames": ["@Basic - Regex", "Basic", "Basic (and reversed card)", "Basic (optional reversed card)", "Basic (type in the answer)", "Basic-faa30", "Basic-faa30-1fa0b", "Basic: Front Only", "Cloze", "Cloze-ef36b", "Image Occlusion"]
         }
     }'
