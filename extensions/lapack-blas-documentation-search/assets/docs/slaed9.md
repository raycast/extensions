```fortran
subroutine slaed9 (
        integer k,
        integer kstart,
        integer kstop,
        integer n,
        real, dimension( * ) d,
        real, dimension( ldq, * ) q,
        integer ldq,
        real rho,
        real, dimension( * ) dlambda,
        real, dimension( * ) w,
        real, dimension( lds, * ) s,
        integer lds,
        integer info
)
```

SLAED9 finds the roots of the secular equation, as defined by the
values in D, Z, and RHO, between KSTART and KSTOP.  It makes the
appropriate calls to SLAED4 and then stores the new matrix of
eigenvectors for use in calculating the next level of Z vectors.

## Parameters
K : INTEGER [in]
> The number of terms in the rational function to be solved by
> SLAED4.  K >= 0.

KSTART : INTEGER [in]

KSTOP : INTEGER [in]
> The updated eigenvalues Lambda(I), KSTART <= I <= KSTOP
> are to be computed.  1 <= KSTART <= KSTOP <= K.

N : INTEGER [in]
> The number of rows and columns in the Q matrix.
> N >= K (delation may result in N > K).

D : REAL array, dimension (N) [out]
> D(I) contains the updated eigenvalues
> for KSTART <= I <= KSTOP.

Q : REAL array, dimension (LDQ,N) [out]

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= max( 1, N ).

RHO : REAL [in]
> The value of the parameter in the rank one update equation.
> RHO >= 0 required.

DLAMBDA : REAL array, dimension (K) [in]
> The first K elements of this array contain the old roots
> of the deflated updating problem.  These are the poles
> of the secular equation.

W : REAL array, dimension (K) [in]
> The first K elements of this array contain the components
> of the deflation-adjusted updating vector.

S : REAL array, dimension (LDS, K) [out]
> Will contain the eigenvectors of the repaired matrix which
> will be stored for subsequent Z vector calculation and
> multiplied by the previously accumulated eigenvectors
> to update the system.

LDS : INTEGER [in]
> The leading dimension of S.  LDS >= max( 1, K ).

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, an eigenvalue did not converge
