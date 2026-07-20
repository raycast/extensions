```fortran
real function slarmm (
        real anorm,
        real bnorm,
        real cnorm
)
```

SLARMM returns a factor s in (0, 1] such that the linear updates

(s \* C) - A \* (s \* B)  and  (s \* C) - (s \* A) \* B

cannot overflow, where A, B, and C are matrices of conforming
dimensions.

This is an auxiliary routine so there is no argument checking.

## Parameters
ANORM : REAL [in]
> The infinity norm of A. ANORM >= 0.
> The number of rows of the matrix A.  M >= 0.

BNORM : REAL [in]
> The infinity norm of B. BNORM >= 0.

CNORM : REAL [in]
> The infinity norm of C. CNORM >= 0.
