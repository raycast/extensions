```fortran
character*1 function chla_transtype (
        integer trans
)
```

This subroutine translates from a BLAST-specified integer constant to
the character string specifying a transposition operation.

CHLA_TRANSTYPE returns an CHARACTER\*1.  If CHLA_TRANSTYPE is 'X',
then input is not an integer indicating a transposition operator.
Otherwise CHLA_TRANSTYPE returns the constant value corresponding to
TRANS.
