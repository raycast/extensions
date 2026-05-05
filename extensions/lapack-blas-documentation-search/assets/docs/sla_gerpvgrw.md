```fortran
real function sla_gerpvgrw (
        integer n,
        integer ncols,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldaf, * ) af,
        integer ldaf
)
```

SLA_GERPVGRW computes the reciprocal pivot growth factor
norm(A)/norm(U). The  norm is used. If this is
much less than 1, the stability of the LU factorization of the
(equilibrated) matrix A could be poor. This also means that the
solution X, estimated condition numbers, and error bounds could be
unreliable.

## Parameters
N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NCOLS : INTEGER [in]
> The number of columns of the matrix A. NCOLS >= 0.

A : REAL array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : REAL array, dimension (LDAF,N) [in]
> The factors L and U from the factorization
> A = P\*L\*U as computed by SGETRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).
