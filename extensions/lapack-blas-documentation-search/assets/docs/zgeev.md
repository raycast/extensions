```fortran
subroutine zgeev (
        character jobvl,
        character jobvr,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) w,
        complex*16, dimension( ldvl, * ) vl,
        integer ldvl,
        complex*16, dimension( ldvr, * ) vr,
        integer ldvr,
        complex*16, dimension( * ) work,
        integer lwork,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZGEEV computes for an N-by-N complex nonsymmetric matrix A, the
eigenvalues and, optionally, the left and/or right eigenvectors.

The right eigenvector v(j) of A satisfies
A \* v(j) = lambda(j) \* v(j)
where lambda(j) is its eigenvalue.
The left eigenvector u(j) of A satisfies
u(j)\*\*H \* A = lambda(j) \* u(j)\*\*H
where u(j)\*\*H denotes the conjugate transpose of u(j).

The computed eigenvectors are normalized to have Euclidean norm
equal to 1 and largest component real.

## Parameters
JOBVL : CHARACTER\*1 [in]
> = 'N': left eigenvectors of A are not computed;
> = 'V': left eigenvectors of are computed.

JOBVR : CHARACTER\*1 [in]
> = 'N': right eigenvectors of A are not computed;
> = 'V': right eigenvectors of A are computed.

N : INTEGER [in]
> The order of the matrix A. N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the N-by-N matrix A.
> On exit, A has been overwritten.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

W : COMPLEX\*16 array, dimension (N) [out]
> W contains the computed eigenvalues.

VL : COMPLEX\*16 array, dimension (LDVL,N) [out]
> If JOBVL = 'V', the left eigenvectors u(j) are stored one
> after another in the columns of VL, in the same order
> as their eigenvalues.
> If JOBVL = 'N', VL is not referenced.
> u(j) = VL(:,j), the j-th column of VL.

LDVL : INTEGER [in]
> The leading dimension of the array VL.  LDVL >= 1; if
> JOBVL = 'V', LDVL >= N.

VR : COMPLEX\*16 array, dimension (LDVR,N) [out]
> If JOBVR = 'V', the right eigenvectors v(j) are stored one
> after another in the columns of VR, in the same order
> as their eigenvalues.
> If JOBVR = 'N', VR is not referenced.
> v(j) = VR(:,j), the j-th column of VR.

LDVR : INTEGER [in]
> The leading dimension of the array VR.  LDVR >= 1; if
> JOBVR = 'V', LDVR >= N.

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,2\*N).
> For good performance, LWORK must generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

RWORK : DOUBLE PRECISION array, dimension (2\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = i, the QR algorithm failed to compute all the
> eigenvalues, and no eigenvectors have been computed;
> elements i+1:N of W contain eigenvalues which have
> converged.
