```fortran
subroutine zheev_2stage (
        character jobz,
        character uplo,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) w,
        complex*16, dimension( * ) work,
        integer lwork,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZHEEV_2STAGE computes all eigenvalues and, optionally, eigenvectors of a
complex Hermitian matrix A using the 2stage technique for
the reduction to tridiagonal.

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

A : COMPLEX\*16 array, dimension (LDA, N) [in,out]
> On entry, the Hermitian matrix A.  If UPLO = 'U', the
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

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The length of the array WORK. LWORK >= 1, when N <= 1;
> otherwise
> If JOBZ = 'N' and N > 1, LWORK must be queried.
> LWORK = MAX(1, dimension) where
> dimension = max(stage1,stage2) + (KD+1)\*N + N
> = N\*KD + N\*max(KD+1,FACTOPTNB)
> + max(2\*KD\*KD, KD\*NTHREADS)
> + (KD+1)\*N + N
> where KD is the blocking size of the reduction,
> FACTOPTNB is the blocking used by the QR or LQ
> algorithm, usually FACTOPTNB=128 is a good choice
> NTHREADS is the number of threads used when
> openMP compilation is enabled, otherwise =1.
> If JOBZ = 'V' and N > 1, LWORK must be queried. Not yet available
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

RWORK : DOUBLE PRECISION array, dimension (max(1, 3\*N-2)) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the algorithm failed to converge; i
> off-diagonal elements of an intermediate tridiagonal
> form did not converge to zero.
