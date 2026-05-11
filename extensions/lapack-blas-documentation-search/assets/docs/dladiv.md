```fortran
subroutine dladiv (
        double precision a,
        double precision b,
        double precision c,
        double precision d,
        double precision p,
        double precision q
)
```

DLADIV performs complex division in  real arithmetic

a + i\*b
p + i\*q = ---------
c + i\*d

The algorithm is due to Michael Baudin and Robert L. Smith
and can be found in the paper

## Parameters
A : DOUBLE PRECISION [in]

B : DOUBLE PRECISION [in]

C : DOUBLE PRECISION [in]

D : DOUBLE PRECISION [in]
> The scalars a, b, c, and d in the above expression.

P : DOUBLE PRECISION [out]

Q : DOUBLE PRECISION [out]
> The scalars p and q in the above expression.
