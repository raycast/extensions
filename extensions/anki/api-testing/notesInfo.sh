curl -s -X POST "http://localhost:8765" \
     -H "Content-Type: application/json" \
     -d '{
         "action": "notesInfo",
         "version": 6,
         "params": {
             "notes": ['"$1"']
         }
     }'
