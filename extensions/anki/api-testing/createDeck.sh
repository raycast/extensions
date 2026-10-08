curl -s -X POST "http://localhost:8765" \
     -H "Content-Type: application/json" \
     -d '{
         "action": "createDeck",
         "version": 6,
         "params": {
             "deck": "'$1'"
         }
     }'
