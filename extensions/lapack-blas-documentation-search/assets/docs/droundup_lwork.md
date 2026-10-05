```fortran
double precision function droundup_lwork (
        integer lwork
)
```

DROUNDUP_LWORK deals with a subtle bug with returning LWORK as a Float.
This routine guarantees it is rounded up instead of down by
multiplying LWORK by 1+eps when it is necessary, where eps is the relative machine precision.
E.g.,

float( 9007199254740993            ) == 9007199254740992
float( 9007199254740993 ) \* (1.+eps) == 9007199254740994

\return DROUNDUP_LWORK
\verbatim
DROUNDUP_LWORK >= LWORK.
DROUNDUP_LWORK is guaranteed to have zero decimal part.
