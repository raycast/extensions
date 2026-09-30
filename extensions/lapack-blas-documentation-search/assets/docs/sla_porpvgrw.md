```fortran
real function sla_porpvgrw (
        character*1 uplo,
        integer ncols,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldaf, * ) af,
        integer ldaf,
        real, dimension( * ) work
)
```

SLA_PORPVGRW computes the reciprocal pivot growth factor
norm(A)/norm(U). The  norm is used. If this is
much less than 1, the stability of the LU factorization of the
(equilibrated) matrix A could be poor. This also means that the
solution X, estimated condition numbers, and error bounds could be
unreliable.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

NCOLS : INTEGER [in]
> The number of columns of the matrix A. NCOLS >= 0.

A : REAL array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : REAL array, dimension (LDAF,N) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*T\*U or A = L\*L\*\*T, as computed by SPOTRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

WORK : REAL array, dimension (2\*N) [out]
