```fortran
subroutine dsyevd_2stage (
        character jobz,
        character uplo,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) w,
        double precision, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

DSYEVD_2STAGE computes all eigenvalues and, optionally, eigenvectors of a
real symmetric matrix A using the 2stage technique for
the reduction to tridiagonal. If eigenvectors are desired, it uses a
divide and conquer algorithm.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.
> Not available in this release.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA, N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the
> leading N-by-N upper triangular part of A contains the
> upper triangular part of the matrix A.  If UPLO = 'L',
> the leading N-by-N lower triangular part of A contains
> the lower triangular part of the matrix A.
> On exit, if JOBZ = 'V', then if INFO = 0, A contains the
> orthonormal eigenvectors of the matrix A.
> If JOBZ = 'N', then on exit the lower triangle (if UPLO='L')
> or the upper triangle (if UPLO='U') of A, including the
> diagonal, is destroyed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

W : DOUBLE PRECISION array, dimension (N) [out]
> If INFO = 0, the eigenvalues in ascending order.

WORK : DOUBLE PRECISION array, [out]
> dimension (LWORK)
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If N <= 1,               LWORK must be at least 1.
> If JOBZ = 'N' and N > 1, LWORK must be queried.
> LWORK = MAX(1, dimension) where
> dimension = max(stage1,stage2) + (KD+1)\*N + 2\*N+1
> = N\*KD + N\*max(KD+1,FACTOPTNB)
> + max(2\*KD\*KD, KD\*NTHREADS)
> + (KD+1)\*N + 2\*N+1
> where KD is the blocking size of the reduction,
> FACTOPTNB is the blocking used by the QR or LQ
> algorithm, usually FACTOPTNB=128 is a good choice
> NTHREADS is the number of threads used when
> openMP compilation is enabled, otherwise =1.
> If JOBZ = 'V' and N > 1, LWORK must be at least
> 1 + 6\*N + 2\*N\*\*2.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal sizes of the WORK and IWORK
> arrays, returns these values as the first entries of the WORK
> and IWORK arrays, and no error message related to LWORK or
> LIWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK.
> If N <= 1,                LIWORK must be at least 1.
> If JOBZ  = 'N' and N > 1, LIWORK must be at least 1.
> If JOBZ  = 'V' and N > 1, LIWORK must be at least 3 + 5\*N.
> 
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the optimal sizes of the WORK and
> IWORK arrays, returns these values as the first entries of
> the WORK and IWORK arrays, and no error message related to
> LWORK or LIWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i and JOBZ = 'N', then the algorithm failed
> to converge; i off-diagonal elements of an intermediate
> tridiagonal form did not converge to zero;
> if INFO = i and JOBZ = 'V', then the algorithm failed
> to compute an eigenvalue while working on the submatrix
> lying in rows and columns INFO/(N+1) through
> mod(INFO,N+1).
